// ====================================================================
// CENTRAL ERROR SYSTEM
// --------------------------------------------------------------------
// Every catch block in the app MUST route through captureError() from
// @/lib/errorCapture. Never swallow errors silently. This file defines
// the error code registry and the bilingual report builder.
// ====================================================================

export const ERROR_CODES = {
  ERR_PERMISSION_DENIED_101: {
    title: 'אין הרשאת גישה',
    message: 'אין לך הרשאה לבצע פעולה זו או לצפות במידע המבוקש.',
    next: 'פנה למנהל המערכת לקבלת הרשאות מתאימות.',
  },
  ERR_PROJECT_ACCESS_202: {
    title: 'אין גישה לפרויקט',
    message: 'לא ניתן לגשת לפרויקט. ייתכן שההרשאות שלך עודכנו.',
    next: 'פנה למנהל המערכת כדי לוודא שיש לך גישה לפרויקט.',
  },
  ERR_PROJECT_LOAD_203: {
    title: 'טעינת פרויקט נכשלה',
    message: 'אירעה תקלה בעת טעינת נתוני הפרויקט מהשרת.',
    next: 'בדוק את החיבור לאינטרנט ונסה שוב. אם הבעיה חוזרת, דווח לנו.',
  },
  ERR_FUNCTION_FAILED_401: {
    title: 'פעולה שרת נכשלה',
    message: 'בקשה לשרת לא הצליחה להתבצע.',
    next: 'נסה שוב בעוד רגע. אם הבעיה חוזרת, דווח לנו.',
  },
  ERR_AI_FAILED_402: {
    title: 'תקלה בעוזר החכם',
    message: 'הבקשה לעוזר ה-AI נכשלה או לא החזירה תשובה.',
    next: 'נסה שוב או נסח מחדש את השאלה. אם זה חוזר, דווח לנו.',
  },
  ERR_LOAD_FAILED_301: {
    title: 'שגיאה בטעינת נתונים',
    message: 'אירעה תקלה בעת טעינת הנתונים מהשרת.',
    next: 'רענן את העמוד ונסה שוב. אם הבעיה חוזרת, דווח לנו.',
  },
  ERR_SAVE_FAILED_302: {
    title: 'שמירה נכשלה',
    message: 'לא ניתן היה לשמור את השינויים.',
    next: 'בדוק את החיבור לאינטרנט ונסה שוב.',
  },
  ERR_UPLOAD_FAILED_303: {
    title: 'העלאת קובץ נכשלה',
    message: 'אירעה תקלה בעת העלאת הקובץ.',
    next: 'ודא שהקובץ תקין ושגודלו סביר, ונסה שוב.',
  },
  ERR_UNKNOWN_500: {
    title: 'שגיאה כללית',
    message: 'אירעה שגיאה בלתי צפויה.',
    next: 'נסה שוב מאוחר יותר או דווח לנו על השגיאה.',
  },
  ERR_REACT_RENDER_501: {
    title: 'שגיאת תצוגה',
    message: 'אירעה שגיאה בעת רינדור הרכיב.',
    next: 'רענן את העמוד. אם הבעיה חוזרת, דווח לנו.',
  },
  ERR_AGENT_ACTION_601: {
    title: 'ביצוע פעולת הסוכן נכשל',
    message: 'הפעולה שביקשת לבצע לא הצליחה להשלים.',
    next: 'הפרטים נשמרו במערכת. אפשר לפתוח פנייה עם קוד השגיאה.',
  },
  ERR_AGENT_NO_PROJECT_602: {
    title: 'הפעולה הופעלה ללא פרויקט',
    message: 'הפעולה דורשת הקשר של פרויקט, אך לא סופק.',
    next: 'נסה שוב עם ציון שם הפרויקט הרלוונטי.',
  },
  ERR_AGENT_PLAN_603: {
    title: 'בניית תוכנית הפעולה נכשלה',
    message: 'המערכת לא הצליחה לבנות את תוכנית הפעולה המבוקשת.',
    next: 'נסה לנסח את הבקשה אחרת, או פתח פנייה.',
  },
  ERR_REMINDER_DISPATCH_604: {
    title: 'שיגור תזכורת לפעמון נכשל',
    message: 'לא הצלחתי לשלוח את התזכורת לפעמון ההתראות.',
    next: 'הפרטים נשמרו במערכת. אפשר לפתוח פנייה עם קוד השגיאה.',
  },
};

export function getErrorInfo(code) {
  return ERROR_CODES[code] || ERROR_CODES.ERR_UNKNOWN_500;
}

/**
 * Builds a bilingual, copy-able error report.
 * Top: Hebrew user-facing summary. Bottom: fixed-format technical block
 * that can be pasted directly into a developer chat for instant
 * debugging context.
 */
export function buildErrorReport(code, context = {}) {
  const info = getErrorInfo(code);
  const ts = new Date();
  const route = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '';
  const pageTitle = typeof document !== 'undefined' ? document.title : '';

  const userEmail = context.userEmail || '';
  const userRole = context.userRole || '';
  const operation = context.operation || '';
  const entityOrFunction = context.entityOrFunction || '';
  const recordId = context.recordId || context.id || '';
  const projectId = context.projectId || '';
  const rawError = context.rawError || context.details || '';
  const statusCode = context.statusCode || '';
  const stack = context.stack || '';
  const component = context.component || context.page || '';

  // --- Hebrew user-facing block ---
  const heLines = [
    `קוד שגיאה: ${code}`,
    `כותרת: ${info.title}`,
    `תיאור: ${info.message}`,
    `הצעד הבא: ${info.next}`,
    '',
  ];

  // --- Technical block (English, fixed format) ---
  const techLines = [
    '=== TECHNICAL REPORT ===',
    `error_code: ${code}`,
    `timestamp: ${ts.toISOString()}`,
    `app_route: ${route}`,
    `page_title: ${pageTitle}`,
  ];
  if (userEmail) techLines.push(`user_email: ${userEmail}`);
  if (userRole) techLines.push(`user_role: ${userRole}`);
  if (operation) techLines.push(`operation: ${operation}`);
  if (entityOrFunction) techLines.push(`entity_or_function: ${entityOrFunction}`);
  if (recordId) techLines.push(`record_id: ${recordId}`);
  if (projectId) techLines.push(`project_id: ${projectId}`);
  if (statusCode) techLines.push(`status_code: ${statusCode}`);
  if (rawError) techLines.push(`raw_error: ${rawError}`);
  if (component) techLines.push(`component: ${component}`);
  if (stack) {
    const stackLines = String(stack).split('\n').slice(0, 5).join('\n  ');
    techLines.push(`stack:\n  ${stackLines}`);
  }
  techLines.push('=== END TECHNICAL REPORT ===');

  return [...heLines, ...techLines].join('\n');
}