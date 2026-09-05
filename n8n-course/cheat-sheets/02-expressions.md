# 🔤 Expressions Cheat Sheet

## المتغيرات

| المتغير | المعنى |
|---|---|
| `$json` | بيانات الـ item الحالي من العقدة **السابقة مباشرة** |
| `$node["اسم"].json` | بيانات عقدة محددة بالاسم |
| `$items("اسم")` | كل items عقدة |
| `$now` | اللحظة الحالية |
| `$today` | بداية اليوم |
| `$execution.id` | معرّف التنفيذ |
| `$workflow.name` | اسم الـ workflow |
| `$runIndex` | رقم الدورة في الحلقة |
| `$vars` | متغيرات النسخة |

## النصوص

```javascript
{{ $json.a + ' ' + $json.b }}              // دمج
{{ `مرحبا ${$json.name}` }}                 // قالب
{{ $json.s.toUpperCase() }}                 // أحرف كبيرة
{{ $json.s.toLowerCase() }}                 // أحرف صغيرة
{{ $json.s.trim() }}                        // إزالة الفراغات
{{ $json.s.replace(/\D/g,'') }}             // أرقام فقط
{{ $json.email.split('@')[1] }}             // النطاق
{{ $json.s.includes('كلمة') }}              // احتواء
{{ $json.s.slice(0, 100) }}                 // اقتطاع
{{ $json.s.length }}                        // الطول
```

## التواريخ (Luxon)

```javascript
{{ $now.toISO() }}
{{ $now.toFormat('yyyy-MM-dd HH:mm') }}
{{ $now.plus({ days: 3 }).toISO() }}
{{ $now.minus({ weeks: 1 }).toISO() }}
{{ $now.startOf('day').toISO() }}
{{ DateTime.fromISO($json.date) }}
{{ Math.floor($now.diff(DateTime.fromISO($json.d),'days').days) }}
```

## المصفوفات

```javascript
{{ $json.arr.map(x => x.name) }}                  // تحويل كل عنصر
{{ $json.arr.filter(x => x.n > 70) }}             // تصفية → مصفوفة
{{ $json.arr.find(x => x.id === 3) }}             // أول مطابق → كائن
{{ $json.arr.reduce((s,x) => s + x.n, 0) }}       // تجميع → قيمة
{{ $json.arr.length }}                             // العدد
{{ $json.arr.join(', ') }}                         // دمج بنص
{{ $json.arr.sort((a,b) => b.n - a.n) }}          // ترتيب تنازلي
{{ $json.arr.some(x => x.n > 90) }}               // هل يوجد؟
{{ $json.arr.every(x => x.n > 0) }}               // هل الكل؟
```

⚠️ **`find` يُرجع كائنًا · `filter` يُرجع مصفوفة**
```javascript
{{ $json.arr.find(x => x.id===1).name }}      // ✅
{{ $json.arr.filter(x => x.id===1)[0].name }} // ✅ لاحظ [0]
```

## الشروط والحماية

```javascript
{{ $json.a > 5 ? 'كبير' : 'صغير' }}    // ثلاثي
{{ $json.name || 'زائر' }}              // بديل عند أي قيمة كاذبة
{{ $json.count ?? 0 }}                  // بديل عند null/undefined فقط
{{ $json.a?.b?.c }}                     // وصول آمن
{{ Number($json.x) }}                   // تحويل لرقم
{{ String($json.x) }}                   // تحويل لنص
{{ !!$json.x }}                         // تحويل لـ boolean
```

⚠️ **`||` مقابل `??` مع الصفر:**
```javascript
{{ $json.qty || 10 }}   // qty=0 → 10  ⚠️
{{ $json.qty ?? 10 }}   // qty=0 → 0   ✅
```

## تشخيص التعبيرات

| الخطأ | السبب |
|---|---|
| `Cannot read property of undefined` | مسار غير موجود → `?.` |
| `x is not a function` | نوع خاطئ |
| يظهر النص حرفيًا | نسيان `{{ }}` |
| `undefined` | اسم حقل خاطئ (حساس للأحرف) |

💡 **التجزئة:** فكّك التعبير مستوى مستوى حتى تجد أول `undefined`.
