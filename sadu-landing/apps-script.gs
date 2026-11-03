/**
 * sadu — مستقبِل بيانات صفحة الهبوط في Google Sheets
 *
 * ينشئ ورقتين تلقائياً:
 *   Leads  : أرقام الجوال والباقة المختارة
 *   Events : كل الأحداث (زيارة، ضغط الزر، ضغط اشترِ الآن، إرسال الرقم)
 *   Summary: نسبة التحويل محسوبة تلقائياً
 *
 * طريقة التركيب في README.md
 */

const LEADS = 'Leads';
const EVENTS = 'Events';
const SUMMARY = 'Summary';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setup_(ss);

    if (d.type === 'lead') {
      const phone = String(d.phone || '');
      if (!/^\+\d{9,14}$/.test(phone)) return ok_();
      ss.getSheetByName(LEADS).appendRow([
        new Date(), "'" + phone, d.plan || '', d.plan_name || '', Number(d.price) || 0,
        d.session || '', d.utm_source || '', d.utm_medium || '', d.utm_campaign || '',
        d.utm_content || '', d.referrer || '', d.ua || ''
      ]);
    } else if (d.type === 'event') {
      ss.getSheetByName(EVENTS).appendRow([
        new Date(), d.event || '', d.plan || '', d.location || '', Number(d.price) || '',
        d.session || '', d.utm_source || '', d.utm_campaign || '', d.page || ''
      ]);
    }
    return ok_();
  } catch (err) {
    return ok_();
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return ok_(); }

function ok_() {
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}

function setup_(ss) {
  if (!ss.getSheetByName(LEADS)) {
    const s = ss.insertSheet(LEADS);
    s.appendRow(['التاريخ', 'الجوال', 'الباقة', 'اسم الباقة', 'السعر', 'الجلسة',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'المصدر', 'الجهاز']);
    s.setFrozenRows(1);
  }
  if (!ss.getSheetByName(EVENTS)) {
    const s = ss.insertSheet(EVENTS);
    s.appendRow(['التاريخ', 'الحدث', 'الباقة', 'المكان', 'السعر', 'الجلسة',
      'utm_source', 'utm_campaign', 'الصفحة']);
    s.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SUMMARY)) {
    const s = ss.insertSheet(SUMMARY);
    const rows = [
      ['المؤشر', 'القيمة', 'شرح'],
      ['الزوار', '=COUNTUNIQUE(FILTER(Events!F2:F, Events!B2:B="page_view"))', 'عدد الجلسات المختلفة'],
      ['ضغطوا "صمّم غرفتك مجاناً"', '=IFERROR(COUNTUNIQUE(FILTER(Events!F2:F, Events!B2:B="cta_click")),0)', 'جلسات'],
      ['ضغطوا "اشترِ الآن" (باقة مدفوعة)', '=IFERROR(COUNTUNIQUE(FILTER(Events!F2:F, Events!B2:B="buy_click")),0)', 'جلسات'],
      ['نسبة الاستعداد للدفع', '=IFERROR(B4/B2,0)', 'الهدف 3% أو أكثر'],
      ['أرقام مسجلة', '=COUNTA(Leads!B2:B)', ''],
      ['أرقام لباقات مدفوعة', '=COUNTIFS(Leads!C2:C,"<>free",Leads!C2:C,"<>")', ''],
      ['', '', ''],
      ['ضغطات "اشترِ الآن" حسب الباقة', '', ''],
      ['جلسة 19', '=COUNTIFS(Events!B2:B,"buy_click",Events!C2:C,"session")', ''],
      ['غرفة 49', '=COUNTIFS(Events!B2:B,"buy_click",Events!C2:C,"room")', ''],
      ['بيت 99', '=COUNTIFS(Events!B2:B,"buy_click",Events!C2:C,"home")', ''],
      ['محترف 149', '=COUNTIFS(Events!B2:B,"buy_click",Events!C2:C,"pro")', '']
    ];
    s.getRange(1, 1, rows.length, 3).setValues(rows);
    s.getRange('B5').setNumberFormat('0.0%');
    s.setFrozenRows(1);
  }
}
