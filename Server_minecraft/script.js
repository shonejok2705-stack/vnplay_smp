/* VNPlay SMP — landing page
 * Mỗi hành vi là một class nhận root element, khởi tạo trong App.
 * Chỉnh cấu hình tại CONFIG; không có phụ thuộc ngoài.
 */
const CONFIG = Object.freeze({
  ip: document.body.dataset.ip,
  statusApi: 'https://api.mcsrvstat.us/3/',
});

/** Hiện thông báo ngắn ở đáy màn hình. */
class Toast {
  constructor(el) { this.el = el; this.timer = 0; }
  show(msg, ms = 1800) {
    this.el.textContent = msg;
    this.el.classList.add('is-on');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('is-on'), ms);
  }
}

/** Thanh tiến độ cuộn + header co lại khi cuộn. */
class ScrollChrome {
  constructor(progress, header) {
    this.progress = progress; this.header = header;
    addEventListener('scroll', () => this.update(), { passive: true });
    this.update();
  }
  update() {
    const max = document.documentElement.scrollHeight - innerHeight;
    this.progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    this.header.classList.toggle('is-scrolled', scrollY > 10);
  }
}

/** Menu di động + highlight mục nav theo section đang xem. */
class Nav {
  constructor(nav, toggle, backdrop) {
    this.nav = nav; this.toggle = toggle;
    this.backdrop = backdrop;
    this.links = [...nav.querySelectorAll('a[href^="#"]')];
    toggle.addEventListener('click', () => this.setOpen(!this.isOpen));
    this.links.forEach(a => a.addEventListener('click', () => this.setOpen(false)));
    backdrop.addEventListener('click', () => this.setOpen(false));
    addEventListener('keydown', e => { if (e.key === 'Escape') this.setOpen(false); });
    addEventListener('resize', () => { if (innerWidth > 720) this.setOpen(false); }, { passive: true });
    this.observeSections();
  }
  get isOpen() { return this.nav.classList.contains('is-open'); }
  setOpen(open) {
    this.nav.classList.toggle('is-open', open);
    this.backdrop.classList.toggle('is-open', open);
    this.backdrop.setAttribute('aria-hidden', String(!open));
    this.toggle.setAttribute('aria-expanded', String(open));
    this.toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  }
  observeSections() {
    const byId = new Map(this.links.map(a => [a.hash.slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        this.links.forEach(a => a.classList.remove('is-active'));
        byId.get(e.target.id)?.classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
}

/** Hiệu ứng xuất hiện khi cuộn tới; stagger tự động theo thứ tự anh em. */
class Reveal {
  constructor(selector = '.reveal') {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll(selector).forEach(el => {
      const siblings = [...el.parentElement.children].filter(c => c.matches(selector));
      el.style.setProperty('--delay', `${Math.min(siblings.indexOf(el), 6) * 90}ms`);
      io.observe(el);
    });
  }
}

/** Tách tiêu đề hero thành từng từ để trượt lên lần lượt. */
class SplitTitle {
  constructor(el) {
    if (!el) return;
    let i = 0;
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(line =>
      line.trim().split(/\s+/).map(w =>
        `<span class="w"><span style="--i:${i++}">${w}</span></span>`
      ).join(' ')
    ).join('<br>');
    requestAnimationFrame(() => el.classList.add('is-in'));
  }
}

/** Khối trang trí hero dịch nhẹ theo con trỏ (parallax). */
class Parallax {
  constructor(container) {
    if (!container || matchMedia('(pointer: coarse)').matches) return;
    this.items = [...container.children];
    container.parentElement.addEventListener('mousemove', e => this.move(e), { passive: true });
  }
  move(e) {
    const dx = (e.clientX / innerWidth - .5) * 24, dy = (e.clientY / innerHeight - .5) * 24;
    this.items.forEach((el, i) => {
      const k = i % 2 ? -1 : 1;
      el.style.setProperty('--px', (dx * k).toFixed(1));
      el.style.setProperty('--py', (dy * k).toFixed(1));
    });
  }
}

/** Hạt pixel đơn sắc rơi chậm trên nền canvas. */
class Ambient {
  constructor(canvas, count = 36) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.dots = Array.from({ length: count }, () => this.spawn(true));
    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) this.tick();
  }
  spawn(anyY) {
    return { x: Math.random(), y: anyY ? Math.random() : -0.02, s: 2 + Math.random() * 3, v: .0003 + Math.random() * .0006, a: .15 + Math.random() * .35 };
  }
  resize() { this.c.width = innerWidth; this.c.height = innerHeight; }
  tick() {
    const { ctx, c } = this;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = getComputedStyle(document.body).color;
    this.dots.forEach((d, i) => {
      d.y += d.v;
      if (d.y > 1.02) this.dots[i] = d = this.spawn(false);
      ctx.globalAlpha = d.a;
      ctx.fillRect(d.x * c.width, d.y * c.height, d.s, d.s);
    });
    requestAnimationFrame(() => this.tick());
  }
}

/** Đếm số từ 0 tới data-to khi vào khung nhìn. */
class Counter {
  constructor(selector = '.count', duration = 1400) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        this.run(e.target, duration); io.unobserve(e.target);
      });
    }, { threshold: .5 });
    document.querySelectorAll(selector).forEach(el => io.observe(el));
  }
  run(el, duration) {
    const to = parseFloat(el.dataset.to), dec = +el.dataset.decimals || 0, t0 = performance.now();
    const frame = now => {
      const p = Math.min(1, (now - t0) / duration), ease = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * ease).toFixed(dec);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

/** Scrollytelling: bước nào ở giữa màn hình thì stage nhận data-step tương ứng. */
class Scrolly {
  constructor(root, scene, label) {
    this.scene = scene; this.label = label;
    this.steps = [...root.querySelectorAll('.step')];
    this.photos = [...scene.querySelectorAll('.scene__photo')];
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) this.activate(e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    this.steps.forEach(s => io.observe(s));
  }
  activate(step) {
    this.steps.forEach(s => s.classList.toggle('is-active', s === step));
    const stepNum = step.dataset.step;
    this.scene.dataset.step = stepNum;
    this.label.textContent = step.dataset.label;
    this.photos.forEach(p => p.classList.toggle('is-active', p.dataset.photo === stepNum));
  }
}

/** Trạng thái máy chủ thật từ mcsrvstat; thất bại thì để dấu gạch, không bịa số. */
class ServerStatus {
  constructor(ip, api) {
    this.ip = ip; this.api = api;
    this.els = {
      dots: document.querySelectorAll('.dot'),
      status: document.getElementById('hud-status'),
      players: document.getElementById('hud-players'),
      version: document.getElementById('hud-version'),
    };
    this.refresh();
    setInterval(() => this.refresh(), 60_000);
  }
  async refresh() {
    try {
      const r = await fetch(this.api + this.ip, { cache: 'no-store' });
      const d = await r.json();
      this.render(d);
    } catch (_) { this.render(null); }
  }
  render(d) {
    const online = !!d?.online;
    this.els.dots.forEach(x => { x.classList.toggle('is-online', online); x.classList.toggle('is-offline', !online); });
    const values = [
      [this.els.status, d ? (online ? 'Trực tuyến' : 'Ngoại tuyến') : 'Không rõ'],
      [this.els.players, online ? `${d.players?.online ?? 0} / ${d.players?.max ?? '—'}` : '—'],
      [this.els.version, online && d.version ? d.version : '—'],
    ];
    values.forEach(([el, value]) => { if (el) el.textContent = value; });
  }
}

/** Accordion: mở một mục thì đóng các mục khác, animate chiều cao bằng WAAPI. */
class Accordion {
  constructor(root) {
    this.items = [...root.querySelectorAll('details')];
    this.items.forEach(d => d.querySelector('summary').addEventListener('click', e => {
      e.preventDefault(); this.toggle(d);
    }));
  }
  toggle(d) {
    this.items.filter(o => o !== d && o.open).forEach(o => this.close(o));
    d.open ? this.close(d) : this.open(d);
  }
  open(d) {
    d.open = true;
    const body = d.querySelector('.accordion__body');
    body.animate([{ height: 0, opacity: 0 }, { height: body.scrollHeight + 'px', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
  close(d) {
    const body = d.querySelector('.accordion__body');
    body.animate([{ height: body.scrollHeight + 'px', opacity: 1 }, { height: 0, opacity: 0 }], { duration: 240, easing: 'ease-in' })
      .onfinish = () => { d.open = false; };
  }
}

/** Thư viện ảnh: lọc theo thể loại & mở Lightbox khi nhấn vào từng ảnh */
class Gallery {
  constructor(root, lightbox) {
    if (!root) return;
    this.root = root;
    this.lightbox = lightbox;
    this.filters = [...document.querySelectorAll('.filter-pill')];
    this.cards = [...root.querySelectorAll('.g-card')];

    this.filters.forEach(btn => {
      btn.addEventListener('click', () => this.filter(btn.dataset.filter, btn));
    });

    this.cards.forEach(card => {
      const btn = card.querySelector('.js-lightbox-trigger');
      btn?.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index, 10);
        this.lightbox.open(idx);
      });
    });
  }

  filter(category, activeBtn) {
    this.filters.forEach(b => b.classList.toggle('is-active', b === activeBtn));
    this.cards.forEach(card => {
      const match = category === 'all' || card.dataset.category === category;
      card.classList.toggle('is-hidden', !match);
    });
  }
}

/** Trình xem ảnh phóng to Lightbox kèm điều hướng phím & cảm ứng vuốt */
class Lightbox {
  constructor(modal) {
    if (!modal) return;
    this.modal = modal;
    this.img = modal.querySelector('#lightbox-img');
    this.tag = modal.querySelector('#lightbox-tag');
    this.title = modal.querySelector('#lightbox-title');
    this.desc = modal.querySelector('#lightbox-desc');
    this.counter = modal.querySelector('#lightbox-counter');
    this.closeBtn = modal.querySelector('#lightbox-close');
    this.prevBtn = modal.querySelector('#lightbox-prev');
    this.nextBtn = modal.querySelector('#lightbox-next');
    this.backdrop = modal.querySelector('#lightbox-backdrop');

    this.items = [];
    this.currentIndex = 0;

    this.collectItems();
    this.bindEvents();
  }

  collectItems() {
    this.items = [...document.querySelectorAll('.g-card')].map(card => {
      const img = card.querySelector('img');
      const tag = card.querySelector('.g-card__tag')?.textContent || '';
      const title = card.querySelector('h3')?.textContent || '';
      const desc = card.querySelector('p')?.textContent || '';
      return {
        src: img?.getAttribute('src') || '',
        alt: img?.getAttribute('alt') || '',
        tag,
        title,
        desc
      };
    });
  }

  bindEvents() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.backdrop?.addEventListener('click', () => this.close());
    this.prevBtn?.addEventListener('click', () => this.prev());
    this.nextBtn?.addEventListener('click', () => this.next());

    window.addEventListener('keydown', e => {
      if (this.modal.hasAttribute('hidden')) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    let touchStartX = 0;
    this.modal.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    this.modal.addEventListener('touchend', e => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 40) {
        diff > 0 ? this.prev() : this.next();
      }
    }, { passive: true });
  }

  open(index = 0) {
    if (!this.items.length) this.collectItems();
    this.currentIndex = (index + this.items.length) % this.items.length;
    this.render();
    this.modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    this.closeBtn?.focus();
  }

  close() {
    this.modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.render();
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.render();
  }

  render() {
    const item = this.items[this.currentIndex];
    if (!item) return;

    this.img.style.opacity = '0';
    setTimeout(() => {
      this.img.src = item.src;
      this.img.alt = item.alt;
      this.img.style.opacity = '1';
    }, 80);

    this.tag.textContent = item.tag;
    this.title.textContent = item.title;
    this.desc.textContent = item.desc;
    this.counter.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
  }
}

class App {
  constructor() {
    const $ = id => document.getElementById(id);
    $('year').textContent = new Date().getFullYear();

    this.toast = new Toast($('toast'));
    new ScrollChrome($('progress'), $('header'));
    new Nav($('nav'), $('nav-toggle'), $('nav-backdrop'));
    new Reveal();
    new SplitTitle(document.querySelector('[data-split]'));
    new Parallax(document.querySelector('.hero__blocks'));
    new Ambient($('ambient'));
    new Counter();
    new Scrolly($('scrolly'), $('scene'), $('scene-label'));
    new ServerStatus(CONFIG.ip, CONFIG.statusApi);
    new Accordion($('accordion'));

    this.lightbox = new Lightbox($('lightbox'));
    new Gallery($('gallery-grid'), this.lightbox);
  }
}

addEventListener('DOMContentLoaded', () => new App());
