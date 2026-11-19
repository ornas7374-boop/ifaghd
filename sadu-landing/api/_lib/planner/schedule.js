// sadu Planning Engine — build schedule: turns the approved plan into a day-by-day "how to build it"
// plan in Arabic, for 2, 3, 4, 5 or 7 days. Pure code (no AI call, no cost): the steps follow the
// order a real setup is built in (empty -> buy -> furniture -> screens -> wall -> lights -> cables -> decor).
const { NAME } = require("./products");

const DAY_OPTIONS = [2, 3, 4, 5, 7];
const WALL_AR = { left: "الجدار الأيسر", back: "الجدار المقابل", right: "الجدار الأيمن" };
const ar = (r) => r.label_ar || (NAME[r.category] || [r.label])[0];
const list = (reqs) => reqs.map(ar).filter((v, i, a) => a.indexOf(v) === i).join("، ");

/** Steps in build order; each has a weight (rough hours) used to spread them over the days. */
function steps(plan) {
  const reqs = (plan.product_requirements || []).filter(r => r.status !== "placeholder");
  const inc = new Set(((plan.budget_allocation || {}).lines || []).filter(l => l.included).map(l => l.key));
  // items in the order the keys are given (desk before chair...), only those the budget kept
  const has = (...keys) => keys.flatMap(k => reqs.filter(r => r.key === k && (inc.size ? inc.has(r.key) : true)));
  const desk = (plan.spatial_plan || {}).desk;
  const u = plan.user_requirements || {};
  const budget = plan.budget_allocation || {};
  const essentials = reqs.filter(r => r.priority === "essential"), extras = reqs.filter(r => r.priority !== "essential");
  const windowLine = (plan.design_rationale || []).find(r => r.decision === "window");
  const out = [];

  out.push({ w: 2, title: "فضّ الغرفة وقِس المكان", tasks: [
    "طلّع الأثاث والستارة والديكور اللي ما تحتاجه، ونظّف الأرضية والجدار.",
    desk ? `قِس ${desk.width_cm} سم على ${WALL_AR[desk.wall] || "الجدار"} مكان المكتب، وعلّم البداية والنهاية بشريط لاصق.` : "اختر الجدار اللي ما يكون فيه الشباك ورا الشاشة، وقِس عرضه.",
    "تأكد من فيش الكهرباء قريب من المكتب، وصوّر المكان قبل البداية."] });

  out.push({ w: 1, title: "اطلب القطع", tasks: [
    essentials.length ? `الأساسيات أولاً: ${list(essentials)}.` : null,
    extras.length ? `الإضافات: ${list(extras)}.` : null,
    budget.budget_sar ? `الميزانية ${budget.budget_sar} ريال (المخطط ${budget.total_planned_sar} ريال واحتياطي ${budget.reserve_sar}).` : "ما حددت ميزانية: قارن الأسعار بين نون وأمازون قبل الطلب.",
    "التوصيل عادة من يوم إلى ٣ أيام: اطلب كل شيء مرة وحدة عشان ما تتأخر."].filter(Boolean) });

  const furn = has("desk", "chair", "drawers");
  if (furn.length) out.push({ w: 3, title: "ركّب الأثاث", tasks: [
    `ركّب ${list(furn)}.`,
    desk ? `حط المكتب على ${WALL_AR[desk.wall] || "الجدار"} في المكان المعلّم، واترك ٩٠ سم على الأقل ورا الكرسي.` : "حط المكتب بحيث الشباك على جنب الشاشة.",
    "اضبط ارتفاع الكرسي: الكوع بزاوية ٩٠ درجة والرجلين على الأرض."] });

  const fillItems = ((plan.room_fill || {}).items || []);
  if (fillItems.length) out.push({ w: 3, title: "أثّث باقي الغرفة", tasks: [
    `ركّب ${fillItems.map(x => x.ar).filter((v, i, a) => a.indexOf(v) === i).join("، ")}.`,
    "القطع الطويلة بعيد عن الشباك والباب، وخل ممر واضح للباب.",
    "ابدأ بالقطع الكبيرة (سرير، كنبة، دولاب) وبعدها الصغيرة."] });

  const screen = has("monitor", "second_monitor", "monitor_arm", "keyboard", "mouse", "mousepad", "monitor_light", "webcam", "microphone");
  if (screen.length) out.push({ w: 2, title: "الشاشة والأجهزة", tasks: [
    `ركّب ${list(screen)}.`,
    "أعلى الشاشة على مستوى العين، وبعدها عنك طول ذراعك تقريباً.",
    "الكيبورد في النص على بعد ٣٠–٤٠ سم من طرف المكتب، والماوس جنبه."] });

  const wall = has("wall_storage", "wall_art", "wall_treatment");
  if (wall.length) out.push({ w: 2, title: "الجدار", tasks: [
    `ركّب ${list(wall)} فوق المكتب أو جنبه.`,
    u.allow_wall ? "إذا بتغيّر الجدار (دهان أو ألواح)، سوّه قبل ما تعلّق أي شيء." : "الجدار نفسه ما يتغيّر: استخدم براغي وتثبيت مناسب بس.",
    "علّم أماكن الثقوب بالميزان قبل الدريل."] });

  const lights = has("accent_light", "desk_lamp", "key_light");
  out.push({ w: 2, title: "الإضاءة والستارة", tasks: [
    lights.length ? `ركّب ${list(lights)}.` : "شغّل إضاءة الشاشة وجرّب الإضاءة في الليل.",
    windowLine ? `الشباك: ${String(windowLine.why).replace(/^old curtains removed; new: /, "ستارة جديدة: ")}.` : null,
    "خل إضاءة السقف الموجودة، وإضاءة LED تكون خفيفة ورا الشاشة مو هي الإضاءة الوحيدة."].filter(Boolean) });

  out.push({ w: 1, title: "ترتيب الأسلاك", tasks: [
    "اجمع الأسلاك تحت المكتب بمجرى أو سلة أسلاك، ووصّلها بمشترك واحد.",
    "خل الأسلاك ما تبين من قدام، وسيب مجال للكمبيوتر يتنفس."] });

  const decor = has("plant");
  out.push({ w: 1, title: "اللمسات الأخيرة", tasks: [
    decor.length ? `حط ${list(decor)} على طرف المكتب.` : "رتّب سطح المكتب: أقل أغراض أحلى.",
    "قارن النتيجة بتصميم sadu، وصوّرها."] });
  return out;
}

/**
 * Spread the steps over `days` days. Day 1 is always "empty + measure + order" (nothing can be built
 * before the pieces arrive); the build steps are spread over the other days by weight, in order.
 * Spare days become "waiting for delivery" right after ordering.
 */
function buildSchedule(plan, days) {
  const st = steps(plan);
  const first = st.slice(0, 2), rest = st.slice(2);
  const out = [{ day: 1, steps: first.map(x => ({ title: x.title, tasks: x.tasks })) }];
  if (days <= 1) { out[0].steps.push(...rest.map(x => ({ title: x.title, tasks: x.tasks }))); return out; }
  const buildDays = Math.min(days - 1, rest.length);
  const waitDays = days - 1 - buildDays;
  for (let i = 0; i < waitDays; i++) out.push({ day: out.length + 1, steps: [{ title: "انتظار التوصيل", tasks: ["تابع الطلبات، وجهّز الأدوات: دريل، ميزان، مفكات، شريط لاصق، ربطات أسلاك."] }] });
  const total = rest.reduce((s, x) => s + x.w, 0), per = total / buildDays;
  const groups = Array.from({ length: buildDays }, () => []);
  let acc = 0, d = 0;
  rest.forEach((x, i) => {
    const left = rest.length - i; // keep at least one step for each remaining day
    if (groups[d].length && d < buildDays - 1 && (acc + x.w / 2 > per * (d + 1) || left <= buildDays - 1 - d)) d++;
    groups[d].push({ title: x.title, tasks: x.tasks }); acc += x.w;
  });
  groups.forEach((g, i) => {
    if (i === 0) g[0] = { ...g[0], tasks: ["لما توصل الطلبات ابدأ هنا.", ...g[0].tasks] };
    out.push({ day: out.length + 1, steps: g });
  });
  return out;
}

function buildSchedules(plan) {
  const o = {};
  for (const d of DAY_OPTIONS) o[d] = buildSchedule(plan, d);
  return o;
}

module.exports = { buildSchedule, buildSchedules, DAY_OPTIONS };
