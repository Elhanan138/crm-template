# CRM & Delivery Operations — תבנית

מערכת CRM וניהול פעילות, עברית RTL. פרויקט Vite + React עצמאי לחלוטין —
אין תלות ב- ואין צורך בו לבנייה, לפריסה או להמשך הפיתוח.

## הפעלה

```bash
npm install
cp .env.example .env.local     # והגדר VITE_OWNER_EMAIL
npm run dev                    # http://localhost:5173
```

| פקודה | תפקיד |
|-------|-------|
| `npm run dev` | שרת פיתוח + כפתור הייצוא |
| `npm run build` | בילד לפרודקשן ל-`dist` |
| `npm run preview` | תצוגה מקומית של הבילד |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## ארכיטקטורה

`src/lib/modules.js` הוא **מקור האמת היחיד**. ממנו נגזרים:
המסלולים (`src/App.jsx`), תפריט הצד (`src/lib/navItems.js`),
דיאלוג הייצוא, וסינון הקבצים בייצוא (`tools/export-zip.js`).
הוספת מודול = הוספת רשומה אחת שם.

שכבת ה-UI מוגדרת ב-[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## ייצוא מודולרי ופריסה

`הגדרות → ייצוא (ZIP)` (בסביבת פיתוח בלבד) מייצר חבילה שנבנית בעצמה,
כולל כלי הייצוא עצמו — כך שכל חבילה מיוצאת יכולה להמשיך ולייצא הלאה.
פירוט מלא: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).
