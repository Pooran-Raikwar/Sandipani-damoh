# Sandipani Advanced - GitHub Pages + Google Sheets

## Architecture
- Static frontend: GitHub Pages
- Backend: Google Apps Script Web App
- Database: Google Spreadsheet created automatically by the backend
- Form Builder: stored in `FormSettings` sheet and rendered dynamically

## One-time setup
1. Create a new Apps Script project and paste `backend/Code.gs`.
2. In Apps Script Project Settings → Script Properties add `ADMIN_PIN` (recommended) and optionally `SCHOOL_NAME`.
3. Deploy → New deployment → Web app → Execute as Me → Anyone.
4. Copy the `/exec` URL.
5. Put it once in `js/config.js` as `DEFAULT_API_URL` OR save it from Admin in your browser.
6. Open Admin and use Initialize / Check Google Sheet. A fresh spreadsheet is created automatically on first setup.
7. Login using your `ADMIN_PIN`.
8. Use Form Builder to manage fields.

## Default vocational setup
- Classes: 9th, 10th, 11th, 12th
- Trade: IT-ITeS
- Job Role: Domestic Data Entry Operator
- Stream for 11th/12th: Science, Commerce, Arts, Vocational

## Important
GitHub Pages cannot execute Apps Script server code. The Apps Script `/exec` URL is the backend API. The website communicates through JSONP so no server of your own is required.
