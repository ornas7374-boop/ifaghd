حقل إدخال كبسولة مع label فوقه، تلميح وخطأ نصي.

- Classes: `k-field`, `k-field__label`, `k-input`, `k-field__hint`, `k-field__error`.
- الحدود `border-strong`، التركيز حلقة `focus` سمكها 2px. الخطأ `aria-invalid="true"` مع نص `k-field__error`؛ اللون وحده لا يكفي.
- `textarea` يأخذ `radius-md` تلقائيًا بدل الكبسولة.
- المستهلك يوفر `label` مربوط بـ `for`، و placeholder مثال لا تعليمة.
