SANDIPANI DIGITAL CAMPUS - FINAL INTEGRATED VERSION

1. Website files are separated:
   index.html
   about.html
   vocational.html
   gallery.html
   results.html
   admin.html
   css/style.css
   js/*.js
   images/*.jpg

2. The 10 uploaded school photos are included locally.

3. Result System:
   backend/Code.gs is based on the uploaded final School_Result_System_PRO_Delete_Duplicate.zip.
   The original functions and Google Sheet ID/Admin PIN are preserved.
   An API bridge was added so a GitHub Pages site can read/write through Apps Script.

4. Google Apps Script:
   - Open backend/Code.gs
   - Paste it into the Apps Script project connected to the same Google Sheet.
   - Deploy as Web app:
       Execute as: Me
       Who has access: Anyone
   - Copy the /exec URL.
   - Open website -> Admin -> paste URL -> Save URL.

5. GitHub:
   Upload the CONTENTS of this folder to the repository ROOT.
   index.html must be directly in the root.
   images/ must be directly in the root.
   Do not upload the ZIP as the website root.

6. The result calculation/data logic in the original final Code.gs is preserved.
