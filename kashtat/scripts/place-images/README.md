# صور الأماكن التدريبية

صور ثلاثية الأبعاد بنفس محرك مشهد الصفحة الرئيسية، بإعدادات لكل مكان في `scenes.mjs`
(لون الرمل، جبال، بحر، نخيل، خيام، وقت اليوم).

```bash
# من مجلد فيه playwright
D=$PWD/scripts/place-images OUT=$PWD/public/places CHROME=/opt/pw-browsers/chromium-*/chrome-linux*/chrome \
  node scripts/place-images/shoot.mjs
```

الناتج: `public/places/<slug>-1.jpg` (الغلاف) و `-2` و `-3`.
لإضافة مكان: أضف مدخلًا في `SCENES` بنفس الـ slug.
