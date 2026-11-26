// آفاق+ membership page: shelf reveal, savings calculator, analytics events.
(function () {
  var root = document.querySelector('.afq-membership');
  if (!root) return;

  var track = function (event, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: event }, params || {}));
  };
  track('membership_page_view');

  // One-time staggered reveal of the shelf, only when motion is allowed and the shelf starts on screen.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var shelf = root.querySelector('.m-shelf');
  if (!reduce && shelf && shelf.getBoundingClientRect().top < window.innerHeight) {
    root.classList.add('is-revealing');
    var last = shelf.lastElementChild;
    if (last) last.addEventListener('animationend', function () { root.classList.remove('is-revealing'); }, { once: true });
  }

  // CTA clicks
  root.addEventListener('click', function (e) {
    var a = e.target.closest('[data-track]');
    if (a) track('membership_cta_click', { plan: a.getAttribute('data-track') });
  });

  // FAQ opens
  root.querySelectorAll('details[data-faq]').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) track('membership_faq_open', { question_id: d.getAttribute('data-faq') });
    });
  });

  // Savings calculator
  var yearly = parseFloat(root.dataset.yearly);
  var discount = parseFloat(root.dataset.discount) / 100;
  var avgBook = parseFloat(root.dataset.avgBook);
  var avgShip = parseFloat(root.dataset.avgShipping);
  var out = root.querySelector('[data-calc-result]');
  var foot = root.querySelector('[data-calc-foot]');
  var calc = root.querySelector('.m-calc');
  var fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  // Without confirmed averages the estimate would be invented: hide the calculator.
  if (!(avgBook > 0) || !(avgShip >= 0) || isNaN(yearly)) {
    if (calc) calc.hidden = true;
    return;
  }
  foot.querySelector('[data-avg-book]').textContent = fmt.format(avgBook);
  foot.querySelector('[data-avg-ship]').textContent = fmt.format(avgShip);
  foot.hidden = false;

  var used = false;
  var render = function (n) {
    var saving = Math.round(n * 12 * avgBook * discount + 12 * avgShip - yearly);
    if (saving > 0) {
      out.innerHTML = 'مع الخطة السنوية توفّر تقريباً <strong><span class="m-num">' + fmt.format(saving) + '</span> ر.س</strong> في السنة.';
    } else {
      out.textContent = 'مع هذا العدد، العضوية المجانية تكفيك الآن. ترقّ إلى آفاق+ متى زادت طلباتك.';
    }
    out.classList.remove('is-updating');
    void out.offsetWidth;
    out.classList.add('is-updating');
  };

  root.querySelectorAll('input[name="m-books"]').forEach(function (input) {
    input.addEventListener('change', function () {
      render(parseInt(input.value, 10));
      if (!used) { used = true; track('membership_calculator_use'); }
    });
    if (input.checked) render(parseInt(input.value, 10));
  });
})();
