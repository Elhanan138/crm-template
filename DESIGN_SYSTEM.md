# Blossom PM — Design System

מסמך ההתייחסות היחיד לשכבה הוויזואלית. כל שינוי UI חייב להתיישר לפיו.
המסמך נגזר מהקוד הקיים (`src/index.css`, `tailwind.config.js`, `src/components/shared/`) — הוא מתעד את הקיים ומקבע אותו, לא ממציא.

---

## 0. חוק העל

**אין צבע שלא מגיע מטוקן.** אין hex, אין צבעי Tailwind גולמיים (`blue-500`, `gray-100`), ואין אלפא אד-הוק על צבע סמנטי כשקיים טוקן ייעודי.

הסיבה המעשית לחוק: `bg-primary/10` מחשב 10% מהסלייט הכהה **על הרקע שמתחתיו** — תוצאה שונה בכל משטח. `bg-accent` הוא ערך מוגדר (`200 14% 95%`) ולכן צפוי בכל מקום. צבע המותג הוא סלייט כהה (`193 9% 19%`, `#2D3436`) — נגזר מהלוגו.

הטוקנים מוגדרים כערכי HSL ב-`:root` ב-`src/index.css`, ללא בלוק `.dark` כרגע. **זה בדיוק מה שהופך את החוק לקריטי:** ברגע שייווסף בלוק כזה, כל מקום שמשתמש בטוקן מתעדכן מעצמו, וכל מקום שכתב `bg-blue-100` יישאר תקוע בבהיר. `--doc-*` הוא היחיד שלא יקבל בלוק כזה — מסמך נדפס על נייר לבן (ראה ההערה ב-`src/index.css`).

**האיסור נאכף.** `no-restricted-syntax` ב-`eslint.config.js` חל על כל `src/**` בחומרת `error` — כולל `src/lib`, כולל מחרוזות בתוך template literal, וכולל מפות מחלקות שלא יושבות ב-JSX. `src/test/designSystem.test.js` בודק את האכיפה עצמה: הורדת החומרה או צמצום הקבצים מפילים טסטים. (עד כה הכלל היה `warn`, ו-`npm run lint` רץ עם `--quiet` שמדפיס שגיאות בלבד — כלומר הוא לא אכף דבר.)

---

## 1. טוקני צבע

| שימוש | טוקן | מחלקות |
|---|---|---|
| רקע עמוד | `--background` | `bg-background` |
| משטח כרטיס | `--card` | `bg-card` |
| טקסט ראשי | `--foreground` | `text-foreground` |
| טקסט משני | `--muted-foreground` | `text-muted-foreground` |
| מסגרת | `--border` | `border-border` |
| מותג / פעולה ראשית | `--primary` | `bg-primary text-primary-foreground` |
| **גוון מותג בהיר** | `--accent` | `bg-accent text-accent-foreground` |
| הצלחה | `--success` | `bg-success-muted text-success` |
| אזהרה | `--warning` | `bg-warning-muted text-warning` |
| מידע | `--info` | `bg-info-muted text-info` |
| שגיאה / מחיקה | `--destructive` | `bg-destructive/10 text-destructive` |
| נייטרלי כהה יותר | `--neutral-muted` | `bg-neutral-muted` |

### 1.1 האיסור המרכזי

```
❌ bg-primary/5   bg-primary/10   bg-primary/15   bg-primary/20   bg-primary/30
❌ text-primary/NN   from-primary/NN   border-brand/NN
✅ bg-accent      text-accent-foreground
```

**אין טוקן `primary-muted`.** `accent` הוא הטוקן הזה. מי שכתב `bg-primary/10` חיפש את `bg-accent` ולא מצא אותו.

### 1.2 אלפא שכן מותרת

| דפוס | סיבה |
|---|---|
אלפא על **צבע המותג** מצומצמת לשלוש צורות, וכל השאר חסום:

| דפוס | תפקיד |
|---|---|
| `bg-primary/90` | הכהיית hover של כפתור מלא. אין טוקן hover ייעודי. |
| `border-primary/30` | קצה מותג — גבול של צ'יפ נבחר, ריחוף שורה, מסגרת מקווקוות. |
| `ring-primary/30` | אותו קצה בדיוק, כטבעת. |

**אין ערך רביעי.** עשרים קבצים בחרו כל אחד אלפא אחרת לאותו דבר עצמו — `/10`, `/20`, `/30`, `/40`, `/50` — ובלי שההבדל אמר משהו. ב-`/10` ו-`/20` הקצה כמעט לא נראה. גם `brand/NN` חסום: `--brand` הוא אותו סלייט בשם שני.

מה להשתמש במקום:

| מה שרצו | מה שנכון |
|---|---|
| משטח מותג בהיר (`bg-primary/10`) | `bg-accent` |
| טבעת **מיקוד** (`ring-primary/20`) | `focus-visible:ring-ring` — הטוקן של `Input` |
| גרדיאנט מותג (`from-primary/5`) | `from-accent`, או `bg-primary` ללא גרדיאנט |
| נקודת צעד שהושלם (`bg-primary/40`) | `bg-primary` — הרוחב מבדיל, לא השקיפות |

אלפא על טוקן **נייטרלי** עדיין מותרת, כי היא לא נשענת על גוון:

| דפוס | סיבה |
|---|---|
| `bg-muted/20` … `bg-muted/60` | ריחוף על שורות טבלה. `muted` נייטרלי, הגוון לא נשבר. |
| `bg-destructive/10` | מקובע ב-`StatusBadge` כטון `destructive`. זו הצורה הקנונית. |

---

## 2. טיפוגרפיה

הגופן היחיד הוא **Heebo**. גודל בסיס `15px`, RTL.

מחלקות מוכנות מ-`src/index.css` (`@layer components`) — להעדיף אותן על צירופים ידניים:

| מחלקה | שימוש |
|---|---|
| `text-page-title` | כותרת עמוד. 20px→24px, bold |
| `text-section-title` | כותרת אזור. 16px→18px, semibold |
| `text-card-title` | כותרת כרטיס. 16px, semibold |
| `text-body` | גוף. 14px |
| `text-caption` | משני / עזרה. 12px, `muted-foreground` |

מדרג בתוך שורת רשימה: כותרת `text-sm font-medium text-foreground` (או `text-[15px] font-semibold` בפריסת ציר), משני `text-xs text-muted-foreground`, צ'יפ `text-[11px] font-medium`.

`font-heebo` מיותר — Heebo הוא ברירת המחדל של `body`. אין להוסיף אותו ידנית בקוד חדש.

---

## 3. משטחים

`--radius: 0.75rem` → `rounded-lg` הוא ברירת המחדל לכל משטח. `rounded-full` לצ'יפים ולכפתורי pill. `rounded-md`/`rounded-sm` = `radius - 4px`.

### 3.1 כרטיס

**קומפוננטת ברירת המחדל היא `@/components/shared/SectionCard`.**

```jsx
<SectionCard title="דגלים ודד-ליינים" icon={Flag} actions={<AddButton />}>
  …
</SectionCard>
```

היא מספקת `bg-card rounded-lg border border-border shadow-sm`, ריפוד `p-5`, כותרת ב-`text-card-title` ואנימציית כניסה.

הערה על החוב הקיים: יש בקוד גם דפוס ידני `bg-card rounded-lg border border-border shadow-card p-6` (למשל `ProjectNotesSection`). שני הדפוסים חיים במקביל. **`SectionCard` הוא היעד.** קומפוננטה חדשה משתמשת בו; קומפוננטה קיימת מהגרת רק כשנוגעים בה ממילא.

### 3.2 אין כרטיס בתוך כרטיס

לפריט ברשימה שבתוך כרטיס אין `border`, אין `bg` משלו ואין `rounded`. הוא מופרד בריווח, במפריד, או בציר אנכי. מסגרת בתוך מסגרת היא הכשל הוויזואלי הנפוץ ביותר במערכת.

---

## 4. תגיות סטטוס וסוג

**`@/components/shared/StatusBadge` הוא המקור היחיד.** אין להגדיר מפת `{ label, color }` מקומית בקומפוננטה.

טונים זמינים: `neutral`, `success`, `warning`, `info`, `destructive`, `accent`.

```jsx
<StatusBadge tone="accent" label="הדרכה" />
```

מיפוי enum→טון חי בקובץ ייעודי תחת `src/lib/` (לדוגמה `src/lib/meetingTypes.js`), אחד לכל enum במערכת, ומכסה את **כל** ערכי ה-enum. ערך לא מוכר נופל ל-`neutral` ולא קורס.

---

## 5. כפתורים

| תפקיד | מחלקות |
|---|---|
| פעולה ראשית | `bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm shadow-none` |
| פעולת כותרת אזור | אותו דבר ב-`h-8 px-3.5 text-xs font-semibold gap-1` |
| משני | `variant="outline" rounded-full h-9 px-4 text-sm` |
| קישור טקסט | `text-xs text-primary hover:underline` |
| אייקון בשורה | `variant="ghost" size="icon" h-7 w-7 text-muted-foreground` |
| מחיקה | אותו אייקון + `hover:text-destructive` |

`text-white` אסור. תמיד `text-primary-foreground` / `text-success-foreground` וכו'.

**תקרה: שלושה כפתורי אייקון גלויים בשורה.** מעבר לכך — `DropdownMenu` עם טריגר `MoreVertical` יחיד.

---

## 6. אייקונים

`lucide-react` בלבד. `w-3.5 h-3.5` בשורה, `w-4 h-4` בכותרת, `w-3 h-3` בתוך צ'יפ. תמיד עם `flex-shrink-0`.

---

## 7. טפסים

**`@/components/shared/Field` עוטף כל שדה.** הוא מספק `space-y-1.5`, `Label` ב-`text-sm font-medium`, כוכבית חובה ב-`text-destructive`, ועזרה ב-`text-caption`.

`Input` / `Select` / `DateField`: `h-10` בטופס מלא, `h-9` בטופס דחוס. `Textarea`: `rows={3} resize-none text-sm`.

טופס יוצא ב-`Sheet` עם `side="left"` ו-`dir="rtl"`, כותרת ב-`px-5 py-3.5 border-b border-border text-right`, גוף ב-`flex-1 overflow-y-auto px-5 py-4`.

מחיקה תמיד דרך `AlertDialog` עם `dir="rtl"` ו-`AlertDialogFooter` ב-`flex-row-reverse gap-2`.

---

## 8. מצב ריק

**`@/components/shared/EmptyState`** לאזור ראשי (עמוד או טאב) — אייקון ב-`w-14 h-14 rounded-lg bg-muted`, כותרת, תיאור, פעולה.

לאזור משני בתוך כרטיס: שורה שקטה במרכז, בלי מסגרת מקווקוות ובלי ריבוע אייקון — `text-sm text-muted-foreground` ומתחתיה קישור טקסט לפעולה.

---

## 9. RTL

`dir="rtl"` על כל טופס, `Sheet`, `AlertDialog`, `SelectContent` ו-`DropdownMenuContent`.

מספרים, תאריכים ומזהי אנגלית עטופים ב-`dir="ltr"` נקודתי כדי שלא יישברו.

בפריסות עם ציר אנכי הציר יושב מימין (`right-[5px]`, `pr-4`) — ראה `MilestoneTimeline.jsx`, שהוא הרפרנס לכל פריסת ציר.

---

## 10. תנועה

`framer-motion`, כניסה בלבד: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}`. `SectionCard` ו-`EmptyState` כבר כוללים זאת. אין אנימציה על עדכון ערך, על ריחוף או על ניווט.

---

## 11. צ'ק־ליסט לפני מיזוג

- [ ] אין hex, אין `blue-500`, אין `bg-primary/10`.
- [ ] אין `text-white` — רק `*-foreground`.
- [ ] כרטיס חדש הוא `SectionCard`.
- [ ] אין מסגרת סביב פריט שבתוך כרטיס.
- [ ] סטטוס/סוג עוברים דרך `StatusBadge`, ומפת ה-enum מכסה את כל הערכים.
- [ ] שדות עטופים ב-`Field`.
- [ ] מקסימום שלושה כפתורי אייקון בשורה.
- [ ] `dir="rtl"` על כל תפריט, טופס ודיאלוג.
- [ ] נבדק ב-Light וב-Dark.