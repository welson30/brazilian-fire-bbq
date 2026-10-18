(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PHONE = '18506259816';

  /* ---------- year ---------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- nav state + action bar ---------- */
  const nav = $('#nav');
  const bar = $('.actionbar');
  const onScroll = () => {
    const sy = window.scrollY;
    nav.classList.toggle('is-scrolled', sy > 40);
    if (bar) bar.classList.toggle('is-visible', sy > window.innerHeight * 0.7);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobile drawer ---------- */
  const toggle = $('.nav__toggle');
  const drawer = $('#drawer');
  const setDrawer = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    drawer.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setDrawer(drawer.hidden));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) setDrawer(false); });

  /* ---------- reveal on scroll ---------- */
  const reveals = $$('.reveal');
  // stagger siblings
  reveals.forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- lazy autoplay videos (play only when visible) ---------- */
  const vids = $$('video[data-autoplay]');
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const v = en.target;
        if (en.isIntersecting) {
          if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
          if (!reduce) v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.15 });
    vids.forEach(v => vio.observe(v));
  }
  const hero = $('.hero__video');
  if (hero && reduce) hero.pause();

  /* ---------- menu tabs ---------- */
  const tabs = $$('.tabs [role="tab"]');
  const select = (t) => {
    tabs.forEach(b => {
      const on = b === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      $('#' + b.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        select(n); n.focus();
      }
    });
  });

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox');
  const lbImg = $('img', lb);
  let lastFocus = null;
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
  $$('.tile[data-full]').forEach(t => t.addEventListener('click', () => {
    lastFocus = t;
    lbImg.src = t.dataset.full;
    lbImg.alt = $('img', t).alt;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lightbox__close', lb).focus();
  }));
  lb.addEventListener('click', e => { if (e.target !== lbImg) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* ---------- quote form -> SMS / WhatsApp ---------- */
  const form = $('#quoteForm');
  if (form) {
    let channel = 'sms';
    $$('button[type="submit"]', form).forEach(b => b.addEventListener('click', () => { channel = b.dataset.channel; }));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = form.elements;
      const required = ['name', 'date', 'guests', 'location'];
      let ok = true;
      required.forEach(n => {
        const bad = !String(f[n].value).trim();
        f[n].setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) ok = false;
      });
      $('.form__error', form).hidden = ok;
      if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }

      let dateTxt = f.date.value;
      try {
        const [yy, mm, dd] = f.date.value.split('-').map(Number);
        dateTxt = new Date(yy, mm - 1, dd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      } catch (_) {}

      const extras = ['bar', 'charcuterie'].filter(n => f[n].checked).map(n => f[n].value);
      const lines = [
        `Hi Brazilian Fire BBQ! I'd like a quote.`,
        ``,
        `Name: ${f.name.value.trim()}`,
        `Event: ${f.type.value}`,
        `Date: ${dateTxt}`,
        `Guests: ${f.guests.value}`,
        `Location: ${f.location.value.trim()}`,
      ];
      if (extras.length) lines.push(`Add-ons: ${extras.join(', ')}`);
      if (f.notes.value.trim()) lines.push(`Notes: ${f.notes.value.trim()}`);
      const msg = lines.join('\n');

      const url = channel === 'wa'
        ? `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`
        : `sms:+${PHONE}${/iPhone|iPad|iPod|Mac/i.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(msg)}`;
      window.location.href = url;
    });
  }

  /* ---------- ember particles ---------- */
  const canvas = $('.embers');
  if (canvas && !reduce) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, parts = [], running = true;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const count = () => Math.round(Math.min(70, (w * h) / 22000));
    const spawn = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: Math.random() * 1.8 + 0.4,
      vy: Math.random() * 0.6 + 0.25,
      vx: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.6 + 0.3,
      life: 0,
      wob: Math.random() * Math.PI * 2,
      hue: 18 + Math.random() * 22,
    });
    resize();
    parts = Array.from({ length: count() }, () => spawn(true));
    window.addEventListener('resize', () => { resize(); const c = count(); while (parts.length < c) parts.push(spawn(true)); parts.length = c; });

    const heroEl = $('.hero');
    new IntersectionObserver(([en]) => { running = en.isIntersecting; if (running) requestAnimationFrame(tick); }).observe(heroEl);

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.life += 1; p.wob += 0.02;
        p.y -= p.vy; p.x += p.vx + Math.sin(p.wob) * 0.25;
        const fade = Math.min(1, p.y / (h * 0.9));
        const alpha = p.a * fade;
        if (p.y < -10 || alpha <= 0.01) Object.assign(p, spawn(false));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `hsla(${p.hue}, 100%, 65%, ${alpha})`);
        g.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();
