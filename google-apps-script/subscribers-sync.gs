/**
 * انسخ هذا الكود كامل والصقه في محرر Apps Script (خطوات النشر في README).
 * وظيفته: يستقبل إيميل من التطبيق ويضيفه كصف جديد في الشيت — بدون تكرار.
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Subscribers");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Subscribers");
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["الإيميل", "تاريخ التسجيل"]);
  }

  var data = JSON.parse(e.postData.contents);
  var email = (data.email || "").toString().trim().toLowerCase();

  if (!email) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "missing email" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var lastRow = sheet.getLastRow();
  var existingEmails = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat()
    : [];

  if (existingEmails.indexOf(email) === -1) {
    sheet.appendRow([email, data.created_at || new Date().toISOString()]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
