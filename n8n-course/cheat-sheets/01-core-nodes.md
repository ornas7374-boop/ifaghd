# 🧩 Core Nodes Cheat Sheet

📌 الإصدارات مُتحقَّقة من n8n 2.37.10

## عقد التدفق

| العقدة | typeVersion | الدور | تحذير |
|---|---|---|---|
| **Edit Fields (Set)** | 3.5 | إنشاء/تعديل/حذف حقول | ⚠️ `Include Other Input Fields` مطفأ = حذف الباقي |
| **IF** | 2.3 | مساران true/false | ⚠️ **فرع غير موصول = فقدان صامت** |
| **Switch** | 3.4 | مسارات متعددة | ⚠️ فعّل Fallback دائمًا |
| **Filter** | 2.3 | إبقاء المطابق | 💡 يُخرج 0 items بنظافة |
| **Merge** | 3.2 | دمج فروع | ⚠️ الوضع الخاطئ = فقدان صامت |
| **Loop Over Items** | 3 | دفعات | ⚠️ وصّل العمل **رجوعًا** للحلقة |

## عقد البيانات

| العقدة | typeVersion | الدور |
|---|---|---|
| **Split Out** | 1 | مصفوفة داخل item → items منفصلة |
| **Aggregate** | 1 | items → item واحد فيه مصفوفة |
| **Remove Duplicates** | 2 | حذف مكرر (+ **عبر التنفيذات**) |
| **Limit** | 1 | تحديد العدد |
| **Date & Time** | 2 | عمليات التاريخ |
| **Compare Datasets** | 2.3 | كشف الفروق بين مجموعتين |
| **Code** | 2 | ⚠️ **بلا وصول للشبكة** |

## المشغّلات

| العقدة | typeVersion | متى |
|---|---|---|
| **Manual Trigger** | — | التطوير فقط |
| **Schedule Trigger** | 1.4 | جدولة زمنية |
| **Webhook** | 2.1 | استقبال من الخارج |
| **Form Trigger** | 2.6 | نموذج ويب |
| **Error Trigger** | 1 | التقاط أخطاء workflow آخر |
| **Execute Workflow Trigger** | 1.2 | مدخل sub-workflow |

## أوضاع Merge

| الوضع | متى |
|---|---|
| `append` | ضم قوائم من فروع متوازية |
| `combine → by fields` | ✅ **الأصح غالبًا** — دمج بمفتاح مشترك |
| `combine → by position` | ⚠️ فقط عند تطابق العدد والترتيب |
| `combineBySql` | أكثر من مدخلين أو تجميعات |
| `chooseBranch` | اختيار فرع وإهمال الباقي |

## متى **لا** تستخدم Code Node

| تريد | استخدم |
|---|---|
| تعديل حقول | Set |
| تصفية | Filter |
| توجيه | IF / Switch |
| تفكيك مصفوفة | Split Out |
| تجميع | Aggregate |
| حذف مكرر | Remove Duplicates |
| تواريخ | Date & Time |
| **HTTP** | **HTTP Request** ← مستحيل في Code |
