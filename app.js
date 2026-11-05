(function () {
  'use strict';
  var K = window.KATALOG;
  var EMAIL = 'info@mthtech.hr';
  var PHONE = '+385 91 474 7227';
  var LS_SEL = 'mth-upit-v2', LS_OLD = 'mth-upit-v1', LS_FORM = 'mth-upit-forma-v1';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = $('#main'), tabs = $('#tabs'), q = $('#q');

  // ---------- Indeks ----------
  var byCode = {}, all = [];
  K.cats.forEach(function (c) {
    c.products.forEach(function (p) { p.cat = c; byCode[p.c] = p; all.push(p); });
  });

  // ---------- Pomoćne ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function eur(v) {
    if (v == null) return '';
    var p = v.toFixed(2).split('.');
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1] + ' €';
  }
  function stavki(n) { return plural(n, 'stavka', 'stavke', 'stavki'); }
  function proizvoda(n) { return plural(n, 'proizvod', 'proizvoda', 'proizvoda'); }
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function load(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; }
  }
  var ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  // ---------- Odabir (stavke upita: proizvod + boja + količina) ----------
  var sel = load(LS_SEL, null);
  if (!Array.isArray(sel)) {
    // prijenos starog odabira (samo šifre) – količina se upisuje u upitu
    sel = load(LS_OLD, []).filter(function (c) { return byCode[c]; }).map(function (c) { return { c: c, col: '', q: null }; });
  }
  sel = sel.filter(function (l) { return l && byCode[l.c]; });
  function linesFor(code) { return sel.filter(function (l) { return l.c === code; }); }
  function isSel(code) { return sel.some(function (l) { return l.c === code; }); }
  function colorOf(p, name) {
    var f = (p.col || []).filter(function (c) { return c[0] === name; })[0];
    return f ? f[1] : null;
  }
  function saveSel(code) { store(LS_SEL, sel); syncSel(code); }
  function addLine(code, col, q) {
    var ex = sel.filter(function (l) { return l.c === code && l.col === col; })[0];
    if (ex) ex.q = q; else sel.push({ c: code, col: col, q: q });
    saveSel(code);
    return !ex;
  }
  function removeLine(i) { var l = sel.splice(i, 1)[0]; saveSel(l && l.c); }
  function lineTotal(l) { var p = byCode[l.c]; return p.pr != null && l.q ? p.pr * l.q : null; }
  function grandTotal() {
    var t = 0, ok = true;
    sel.forEach(function (l) { var v = lineTotal(l); if (v == null) ok = false; else t += v; });
    return { t: t, ok: ok };
  }
  function syncSel(code) {
    if (code) {
      document.querySelectorAll('.card[data-code="' + CSS.escape(code) + '"]').forEach(function (el) {
        el.classList.toggle('sel', isSel(code));
      });
    }
    var n = sel.length, badge = $('#badge');
    badge.hidden = !n;
    if (badge.textContent !== String(n)) {
      badge.textContent = n;
      badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop');
    }
    $('#dock').hidden = !n;
    $('#dockN').textContent = n;
    $('#dockW').textContent = stavki(n);
    renderSelList();
    if (onlySel && current.view === 'cat') applyFilters();
  }

  // ---------- Kartica ----------
  function swatches(p, max) {
    if (!p.col) return '';
    var list = p.col.slice(0, max || 99);
    var extra = p.col.length - list.length;
    return '<span class="sw" title="' + esc(p.col.map(function (c) { return c[0]; }).join(', ')) + '">' +
      list.map(function (c) { return '<i style="background:' + esc(c[1]) + '"></i>'; }).join('') +
      (extra > 0 || p.more ? '<em>' + (extra > 0 ? '+' + extra : '+') + '</em>' : '') + '</span>';
  }
  function lasers(p) {
    return '<span class="lzs">' + p.l.map(function (l) { return '<span class="lz">' + esc(l) + '</span>'; }).join('') + '</span>';
  }
  function card(p) {
    var on = isSel(p.c);
    return '<div class="card' + (on ? ' sel' : '') + '" role="button" tabindex="0" aria-haspopup="dialog" data-code="' + esc(p.c) + '" aria-label="' + esc(p.n + ', šifra ' + p.c + ' – otvori detalje') + '">' +
      '<div class="ph"><img loading="lazy" decoding="async" src="' + esc(p.i) + '" alt="">' +
      '<span class="check">' + ICON.check + '</span>' +
      '<span class="sel-tag">U upitu</span>' +
      (p.x ? '<button type="button" class="more" data-info="' + esc(p.c) + '" data-gal="1" hidden aria-label="Više slika: ' + esc(p.n) + '">' + ICON.cam + '<em></em></button>' : '') +
      '</div>' +
      '<div class="bd"><div class="nm"><b>' + esc(p.n) + '</b><span class="code">' + esc(p.c) + '</span></div>' +
      '<div class="desc">' + esc(p.d) + '</div>' +
      (p.pr != null ? '<div class="price"><b>' + eur(p.pr) + '</b><span>graviranje uključeno</span></div>' : '') +
      '<div class="meta"><span>Materijal: <b>' + esc(p.m) + '</b></span><span class="dim">' + esc(p.dim) + '</span>' +
      '<div class="foot-row">' + (swatches(p, 10) || '<span></span>') + lasers(p) + '</div></div>' +
      '</div></div>';
  }

  // ---------- Pogledi ----------
  var current = { view: 'home' }, laserF = [], onlySel = false;

  function renderTabs(active) {
    tabs.innerHTML = '<a href="#/"' + (active === 'home' ? ' class="on" aria-current="page"' : '') + '>Sve kategorije</a>' +
      K.cats.map(function (c) {
        var on = active === c.id;
        return '<a href="#/k/' + c.id + '"' + (on ? ' class="on" aria-current="page"' : '') + '><i>' + c.id + '</i>' + esc(c.name) + '</a>';
      }).join('');
    var a = tabs.querySelector('.on');
    if (a && a.scrollIntoView) {
      var l = a.offsetLeft - tabs.clientWidth / 2 + a.clientWidth / 2;
      tabs.scrollTo({ left: l, behavior: 'smooth' });
    }
  }

  function renderHome() {
    document.title = 'MTHtech – Katalog za lasersko graviranje';
    renderTabs('home');
    var mos = ['assets/ignis-soft.jpg', K.cats[1].hero[0], K.cats[7].hero[0], K.cats[5].hero[0]];
    main.innerHTML =
      '<section class="hero"><div class="hero-in"><div>' +
        '<span class="chip"><b>2026</b>MTHtech · Katalog proizvoda</span>' +
        '<h1>Vaš logo,<br><span>trajno ugraviran.</span></h1>' +
        '<p>Promotivni proizvodi od drva, metala, kože i drugih materijala koje graviramo vlastitim CO2, diodnim i IR laserima. Uz svaki proizvod je konačna cijena po komadu, a usluga graviranja logotipa uključena je u cijenu. Odaberite proizvode i pošaljite upit.</p>' +
        '<div class="cta-row"><button type="button" class="btn btn-lime btn-lg" data-scroll="kategorije">Pregledaj katalog ' + ICON.arrow + '</button>' +
        '<button type="button" class="btn btn-ghost btn-lg" data-scroll="kako">Kako poslati upit</button></div>' +
        '<div class="stats"><div><b>' + all.length + '</b><span>proizvoda</span></div><div><b>' + K.cats.length + '</b><span>kategorija</span></div><div><b>3</b><span>vrste lasera</span></div></div>' +
        '<p class="vat">Oslobođeno plaćanja PDV-a temeljem odredbe čl. 90. st. 1. Zakona o porezu na dodanu vrijednost.</p>' +
      '</div><div class="mosaic" aria-hidden="true">' + mos.map(function (s) { return '<div><img src="' + esc(s) + '" alt=""></div>'; }).join('') + '</div></div></section>' +

      '<section class="section" id="kategorije"><div class="wrap"><div class="sec-hd"><div><div class="eyebrow">Kategorije</div><h2>Što tražite?</h2></div></div>' +
      '<div class="cats">' + K.cats.map(function (c) {
        return '<a class="cat" href="#/k/' + c.id + '"><div class="cat-img">' +
          c.hero.slice(0, 3).map(function (s) { return '<div><img loading="lazy" src="' + esc(s) + '" alt=""></div>'; }).join('') +
          '</div><div class="cat-bd"><div class="cat-top"><span class="num">' + c.id + '</span><span class="cnt">' + c.products.length + ' ' + proizvoda(c.products.length) + '</span></div>' +
          '<h3>' + esc(c.name) + '</h3><p>' + esc(c.intro) + '</p><span class="go">Otvori ' + ICON.arrow + '</span></div></a>';
      }).join('') + '</div></div></section>' +

      '<section class="section how" id="kako"><div class="wrap"><div class="sec-hd"><div><div class="eyebrow">Upit za cijenu</div><h2>Tri koraka do ponude</h2></div></div>' +
      '<div class="steps">' +
        '<div class="step"><h3>Odaberite proizvode</h3><p>Kliknite na proizvod, odaberite boju, upišite količinu i dodajte ga u upit. Odabir se pamti.</p></div>' +
        '<div class="step"><h3>Ispunite upit</h3><p>Gumb „Upit” gore desno prikazuje odabrane proizvode s bojom, količinom i ukupnim iznosom. Dodajte svoje podatke i napomenu.</p></div>' +
        '<div class="step"><h3>Pošaljite</h3><p>Pošaljite e-mailom jednim klikom ili kopirajte upit i pošaljite ga porukom na ' + PHONE + '.</p></div>' +
      '</div></div></section>' +

      '<section class="section"><div class="wrap"><div class="sec-hd"><div><div class="eyebrow">Laseri</div><h2>Koji laser za koji materijal</h2></div></div>' +
      '<p style="max-width:720px;font:400 16px/1.6 var(--font-sans)">' + esc(K.about[0]) + '</p>' +
      '<div class="lasers">' + K.lasers.map(function (l) {
        return '<div class="laser"><span class="lz">' + esc(l.id) + '</span><p>' + esc(l.text) + '</p></div>';
      }).join('') + '</div></div></section>';
  }

  function toolbar(count) {
    return '<div class="toolbar"><div class="toolbar-in"><span class="lbl">Laser</span>' +
      ['CO2', 'DIODA', 'IR'].map(function (l) {
        return '<button type="button" class="fchip" data-laser="' + l + '" aria-pressed="' + (laserF.indexOf(l) !== -1) + '">' + l + '</button>';
      }).join('') +
      '<label class="only"><input type="checkbox" id="onlySel"' + (onlySel ? ' checked' : '') + '> Samo odabrani</label>' +
      '<span class="res" id="res">' + count + '</span></div></div>';
  }

  function renderCat(id) {
    var c = K.cats.filter(function (x) { return x.id === id; })[0];
    if (!c) { location.hash = '#/'; return; }
    document.title = c.name + ' – MTHtech katalog';
    renderTabs(c.id);
    main.innerHTML =
      '<section class="cat-hero"><div class="cat-hero-in"><span class="ghost" aria-hidden="true">' + c.id + '</span><div>' +
      '<div class="eyebrow"><b>' + c.id + '</b>Kategorija · ' + c.products.length + ' ' + proizvoda(c.products.length) + '</div>' +
      '<h1>' + esc(c.name) + '</h1><p>' + esc(c.intro) + '</p></div></div></section>' +
      toolbar('') +
      '<div class="wrap"><div class="grid" id="grid">' + c.products.map(card).join('') + '</div>' +
      '<div class="empty-st" id="none" hidden><h2>Nema proizvoda za odabrani filter</h2><p>Isključite neki od filtera iznad.</p></div></div>';
    applyFilters();
  }

  function renderSearch(term) {
    var t = norm(term.trim());
    var words = t.split(/\s+/).filter(Boolean);
    var res = all.filter(function (p) {
      var hay = norm([p.n, p.c, p.c.replace(/\./g, ''), p.d, p.m, p.cat.name, (p.col || []).map(function (c) { return c[0]; }).join(' ')].join(' '));
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
    document.title = 'Pretraga: ' + term + ' – MTHtech katalog';
    renderTabs('');
    main.innerHTML =
      '<section class="cat-hero"><div class="cat-hero-in"><div><div class="eyebrow">Pretraga</div>' +
      '<h1>„' + esc(term.trim()) + '”</h1><p>' + res.length + ' ' + proizvoda(res.length) + ' u svim kategorijama.</p></div></div></section>' +
      (res.length
        ? '<div class="wrap"><div class="grid">' + res.map(card).join('') + '</div></div>'
        : '<div class="wrap empty-st"><h2>Ništa nije pronađeno</h2><p>Pokušajte s drugim nazivom, šifrom (npr. 22.059) ili materijalom (drvo, metal, koža).</p></div>');
  }

  function applyFilters() {
    var grid = $('#grid'); if (!grid) return;
    var shown = 0;
    grid.querySelectorAll('.card').forEach(function (el) {
      var p = byCode[el.dataset.code];
      var ok = (!laserF.length || p.l.some(function (l) { return laserF.indexOf(l) !== -1; })) && (!onlySel || isSel(p.c));
      el.hidden = !ok; if (ok) shown++;
    });
    $('#res').textContent = shown + ' ' + proizvoda(shown);
    $('#none').hidden = shown > 0;
  }

  // ---------- Router ----------
  function route() {
    var h = location.hash;
    if (q.value.trim()) { q.value = ''; }
    var m = h.match(/^#\/k\/(\d+)/);
    if (m) { current = { view: 'cat', id: m[1] }; renderCat(m[1]); markExtras(); }
    else { current = { view: 'home' }; renderHome(); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  var st;
  q.addEventListener('input', function () {
    clearTimeout(st);
    st = setTimeout(function () {
      if (q.value.trim().length >= 2) { current = { view: 'search' }; renderSearch(q.value); markExtras(); window.scrollTo(0, 0); }
      else if (!q.value.trim() && current.view === 'search') { route(); }
    }, 180);
  });
  q.addEventListener('keydown', function (e) { if (e.key === 'Escape') { q.value = ''; route(); } });

  // ---------- Klikovi u sadržaju ----------
  tabs.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href') === (location.hash || '#/')) { e.preventDefault(); route(); }
  });
  $('.brand').addEventListener('click', function (e) {
    if ((location.hash || '#/') === '#/') { e.preventDefault(); route(); }
  });

  main.addEventListener('click', function (e) {
    var sc = e.target.closest('[data-scroll]');
    if (sc) { document.getElementById(sc.dataset.scroll).scrollIntoView({ behavior: 'smooth' }); return; }
    var info = e.target.closest('[data-info]');
    if (info) { e.stopPropagation(); openDetail(info.dataset.info, !!info.dataset.gal); return; }
    var c = e.target.closest('.card');
    if (c) { openDetail(c.dataset.code); return; }
    var f = e.target.closest('[data-laser]');
    if (f) {
      var l = f.dataset.laser, i = laserF.indexOf(l);
      if (i === -1) laserF.push(l); else laserF.splice(i, 1);
      f.setAttribute('aria-pressed', i === -1);
      applyFilters();
    }
  });
  main.addEventListener('change', function (e) {
    if (e.target.id === 'onlySel') { onlySel = e.target.checked; applyFilters(); }
  });
  main.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('card')) {
      e.preventDefault(); e.target.click();
    }
  });
  document.addEventListener('error', function (e) {
    if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden';
  }, true);

  // ---------- Dodatne slike ----------
  // p.x = kandidati za dodatne slike; prikazuju se samo one koje se stvarno učitaju.
  var probed = {};
  function extras(p) {
    if (!p.x) return Promise.resolve([]);
    if (!probed[p.c]) {
      probed[p.c] = Promise.all(p.x.map(function (u) {
        return new Promise(function (res) {
          var im = new Image();
          im.onload = function () { res(im.naturalWidth > 1 ? u : null); };
          im.onerror = function () { res(null); };
          im.src = u;
        });
      })).then(function (a) { return a.filter(Boolean); });
    }
    return probed[p.c];
  }
  function markExtras() {
    main.querySelectorAll('.more[data-info]').forEach(function (b) {
      extras(byCode[b.dataset.info]).then(function (a) {
        if (a.length) { b.hidden = false; b.querySelector('em').textContent = (a.length + 1) + ' slike'; }
      });
    });
  }

  // ---------- Detalji ----------
  var dlg = $('#detail'), dState = null;
  function openDetail(code, gal) {
    var p = byCode[code];
    dState = { p: p, col: p.col && p.col.length === 1 ? p.col[0][0] : '' };
    var cols = p.col ? p.col.map(function (c) {
      return '<button type="button" class="cbtn" role="radio" aria-checked="false" data-col="' + esc(c[0]) + '" title="' + esc(c[0]) + '" aria-label="' + esc(c[0]) + '" style="background:' + esc(c[1]) + '"></button>';
    }).join('') + (p.more ? '<button type="button" class="cbtn cbtn-txt" role="radio" aria-checked="false" data-col="Druga boja">Druga boja</button>' : '') : '';
    dlg.innerHTML = '<button class="d-x" type="button" data-close aria-label="Zatvori">' + ICON.x + '</button>' +
      '<div class="d-in"><div class="d-img"><img src="' + esc(p.i) + '" alt="' + esc(p.n) + '"></div><div class="d-bd">' +
      '<div class="eyebrow">' + p.cat.id + ' · ' + esc(p.cat.name) + '</div>' +
      '<div><h2 id="dTitle">' + esc(p.n) + '</h2><div class="code" style="margin-top:6px">Šifra ' + esc(p.c) + '</div></div>' +
      (p.pr != null ? '<div class="price price-lg"><b>' + eur(p.pr) + '</b><span>po komadu, usluga laserskog graviranja logotipa uključena je u cijenu</span></div>' : '') +
      '<p style="font:400 15.5px/1.5 var(--font-sans);color:var(--ink-700)">' + esc(p.d) + '</p>' +

      '<div class="d-add">' +
        (p.col ? '<div class="d-lbl">Boja <b id="dColName"></b></div><div class="d-cols" role="radiogroup" aria-label="Boja">' + cols + '</div>' : '') +
        '<div class="d-row"><div><div class="d-lbl"><label for="dQty">Količina</label></div>' +
          '<div class="qty"><button type="button" data-q="-1" aria-label="Manje">−</button>' +
          '<input id="dQty" type="number" min="1" step="1" inputmode="numeric" placeholder="kom">' +
          '<button type="button" data-q="1" aria-label="Više">+</button></div></div>' +
          '<div class="d-sum" id="dSum"></div></div>' +
        '<p class="hint" id="dHint" role="status"></p>' +
        '<div class="d-btns"><button type="button" class="btn btn-lime btn-lg" data-add>' + ICON.check + ' Dodaj u upit</button>' +
        '<button type="button" class="btn btn-ghost btn-lg" data-go hidden>Pregledaj upit</button></div>' +
        '<ul class="d-lines" id="dLines"></ul>' +
      '</div>' +

      '<dl><dt>Materijal</dt><dd>' + esc(p.m) + '</dd><dt>Dimenzije</dt><dd>' + esc(p.dim) + '</dd>' +
      '<dt>Laser</dt><dd>' + lasers(p) + '</dd></dl>' +
      (p.s ? '<div class="d-sg"><span class="eyebrow">Prijedlog personalizacije</span>' + esc(p.s) + '</div>' : '') +
      (p.nt ? '<p class="small">' + esc(p.nt) + '</p>' : '') +
      '</div></div>';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.scrollTop = 0;
    pickCol(dState.col);
    renderDLines();
    updSum();
    extras(p).then(function (list) {
      if (!list.length || !dlg.open) return;
      var imgs = [p.i].concat(list), box = dlg.querySelector('.d-img');
      box.classList.add('has-th');
      box.insertAdjacentHTML('beforeend', '<div class="d-th">' + imgs.map(function (u, i) {
        return '<button type="button" data-img="' + esc(u) + '" aria-label="Slika ' + (i + 1) + '"><img src="' + esc(u) + '" alt=""></button>';
      }).join('') + '</div>');
      showImg(gal ? list[0] : p.i);
    });
  }
  function pickCol(name) {
    if (!dState) return;
    dState.col = name;
    dlg.querySelectorAll('.cbtn').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.col === name ? 'true' : 'false'); });
    var lbl = $('#dColName', dlg);
    if (lbl) { lbl.textContent = name ? '· ' + name : '· odaberite'; lbl.classList.toggle('need', !name); }
    // ako je ova boja već u upitu, ponudi njenu količinu
    var ex = sel.filter(function (l) { return l.c === dState.p.c && l.col === name; })[0];
    var inp = $('#dQty', dlg);
    if (inp && ex && ex.q) inp.value = ex.q;
    updSum();
  }
  function qtyVal() {
    var v = parseInt($('#dQty', dlg).value, 10);
    return isNaN(v) || v < 1 ? null : v;
  }
  function updSum() {
    var el = $('#dSum', dlg); if (!el || !dState) return;
    var q = qtyVal(), p = dState.p;
    el.innerHTML = q && p.pr != null ? '<span>Ukupno</span><b>' + eur(p.pr * q) + '</b>' : '';
  }
  function renderDLines() {
    var ul = $('#dLines', dlg); if (!ul || !dState) return;
    var p = dState.p, ls = [];
    sel.forEach(function (l, i) { if (l.c === p.c) ls.push([l, i]); });
    ul.innerHTML = ls.length ? '<li class="d-lines-hd">U upitu</li>' + ls.map(function (x) {
      var l = x[0], hex = colorOf(p, l.col);
      return '<li>' + (hex ? '<i style="background:' + esc(hex) + '"></i>' : '') +
        '<span>' + esc(l.col || 'Bez odabira boje') + '</span><b>' + (l.q ? l.q + ' kom' : 'količina?') + '</b>' +
        '<button type="button" data-drm="' + x[1] + '" aria-label="Ukloni">' + ICON.x + '</button></li>';
    }).join('') : '';
    var go = dlg.querySelector('[data-go]');
    if (go) { go.hidden = !sel.length; go.textContent = 'Pregledaj upit (' + sel.length + ')'; }
  }
  function showImg(u) {
    dlg.querySelector('.d-img > img').src = u;
    dlg.querySelectorAll('[data-img]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.img === u ? 'true' : 'false'); });
  }
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); return; }
    var im = e.target.closest('[data-img]');
    if (im) { showImg(im.dataset.img); return; }
    var cb = e.target.closest('.cbtn');
    if (cb) { pickCol(cb.dataset.col); $('#dHint', dlg).textContent = ''; return; }
    var qb = e.target.closest('[data-q]');
    if (qb) {
      var inp = $('#dQty', dlg), v = (qtyVal() || 0) + parseInt(qb.dataset.q, 10);
      inp.value = Math.max(1, v); updSum(); $('#dHint', dlg).textContent = ''; return;
    }
    var rm = e.target.closest('[data-drm]');
    if (rm) { removeLine(+rm.dataset.drm); renderDLines(); return; }
    if (e.target.closest('[data-go]')) { dlg.close(); openInq(); return; }
    if (e.target.closest('[data-add]')) {
      var p = dState.p, h = $('#dHint', dlg), q = qtyVal();
      h.className = 'hint';
      if (p.col && !dState.col) { h.textContent = 'Odaberite boju.'; return; }
      if (!q) { h.textContent = 'Upišite količinu.'; $('#dQty', dlg).focus(); return; }
      var isNew = addLine(p.c, dState.col, q);
      h.className = 'hint ok';
      h.textContent = (isNew ? 'Dodano u upit' : 'Količina ažurirana') + (p.col ? ' – možete odabrati i drugu boju.' : '.');
      toast((isNew ? 'Dodano: ' : 'Ažurirano: ') + p.n + (dState.col ? ' · ' + dState.col : '') + ' · ' + q + ' kom');
      renderDLines();
      if (p.col && p.col.length > 1) { $('#dQty', dlg).value = ''; pickCol(''); }
    }
  });
  dlg.addEventListener('input', function (e) { if (e.target.id === 'dQty') { updSum(); $('#dHint', dlg).textContent = ''; } });
  dlg.addEventListener('keydown', function (e) { if (e.target.id === 'dQty' && e.key === 'Enter') { e.preventDefault(); dlg.querySelector('[data-add]').click(); } });

  // ---------- Drawer upita ----------
  var drawer = $('#drawer'), scrim = $('#scrim'), lastFocus;
  function openInq() {
    lastFocus = document.activeElement;
    $('#toast').classList.remove('on');
    drawer.hidden = scrim.hidden = false;
    requestAnimationFrame(function () { drawer.classList.add('on'); scrim.classList.add('on'); });
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#closeInq').focus(); }, 50);
  }
  function closeInq() {
    drawer.classList.remove('on'); scrim.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(function () { drawer.hidden = scrim.hidden = true; }, 300);
    if (lastFocus) lastFocus.focus();
  }
  $('#openInq').addEventListener('click', openInq);
  $('#dockBtn').addEventListener('click', openInq);
  $('#closeInq').addEventListener('click', closeInq);
  scrim.addEventListener('click', closeInq);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) closeInq(); });

  function renderSelList() {
    var ul = $('#selList');
    ul.innerHTML = sel.map(function (l, i) {
      var p = byCode[l.c], hex = colorOf(p, l.col), tot = lineTotal(l);
      return '<li data-i="' + i + '"><span class="t"><img src="' + esc(p.i) + '" alt=""></span>' +
        '<div class="sel-info"><b>' + esc(p.n) + '</b><span>' + esc(p.c) + (p.pr != null ? ' · ' + eur(p.pr) + '/kom' : '') + '</span>' +
        (p.col ? '<span class="sel-col' + (l.col ? '' : ' need') + '"><i data-sw="' + i + '" style="background:' + esc(hex || 'transparent') + '"></i>' +
          '<select data-ci="' + i + '" aria-label="Boja: ' + esc(p.n) + '"' + (l.col ? '' : ' aria-invalid="true"') + '>' +
          (l.col ? '' : '<option value="">Odaberite boju</option>') +
          p.col.map(function (c) { return '<option' + (c[0] === l.col ? ' selected' : '') + '>' + esc(c[0]) + '</option>'; }).join('') +
          (p.more ? '<option' + (l.col === 'Druga boja' ? ' selected' : '') + '>Druga boja</option>' : '') +
          '</select></span>' : '') + '</div>' +
        '<div class="sel-q"><label><input type="number" min="1" step="1" inputmode="numeric" value="' + (l.q || '') + '" data-qi="' + i + '" aria-label="Količina: ' + esc(p.n) + '"' + (l.q ? '' : ' aria-invalid="true"') + '> kom</label>' +
        '<strong class="sel-pr" data-ti="' + i + '">' + (tot != null ? eur(tot) : '') + '</strong></div>' +
        '<button type="button" data-rm="' + i + '" aria-label="Ukloni ' + esc(p.n) + '">' + ICON.x + '</button></li>';
    }).join('');
    $('#selEmpty').hidden = sel.length > 0;
    $('#clearSel').hidden = sel.length < 2;
    updTotal();
    $('#inqTitle').textContent = sel.length ? 'U upitu: ' + sel.length + ' ' + stavki(sel.length) : 'Odabrani proizvodi';
  }
  function updTotal() {
    var el = $('#selTotal'), g = grandTotal();
    el.hidden = !sel.length;
    el.innerHTML = '<span>Ukupno' + (g.ok ? '' : ' (bez stavki bez količine)') + '</span><b>' + eur(g.t) + '</b>';
  }
  $('#selList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (b) removeLine(+b.dataset.rm);
  });
  $('#selList').addEventListener('input', function (e) {
    var i = e.target.dataset.qi; if (i == null) return;
    var v = parseInt(e.target.value, 10);
    sel[+i].q = isNaN(v) || v < 1 ? null : v;
    store(LS_SEL, sel);
    if (sel[+i].q) e.target.removeAttribute('aria-invalid');
    var t = lineTotal(sel[+i]);
    $('[data-ti="' + i + '"]').textContent = t != null ? eur(t) : '';
    updTotal();
    hint.textContent = '';
  });
  $('#selList').addEventListener('change', function (e) {
    var i = e.target.dataset.ci; if (i == null) return;
    var l = sel[+i]; l.col = e.target.value; store(LS_SEL, sel); renderSelList(); hint.textContent = '';
  });
  $('#clearSel').addEventListener('click', function () {
    var codes = sel.map(function (l) { return l.c; }); sel = []; store(LS_SEL, sel);
    codes.forEach(function (c) { syncSel(c); }); syncSel();
  });

  // ---------- Forma ----------
  var form = $('#form'), hint = $('#formHint');
  var saved = load(LS_FORM, {});
  Array.prototype.forEach.call(form.elements, function (el) { if (el.name && saved[el.name]) el.value = saved[el.name]; });
  form.addEventListener('input', function (e) {
    var d = {}; Array.prototype.forEach.call(form.elements, function (el) { if (el.name) d[el.name] = el.value; });
    store(LS_FORM, d);
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    hint.textContent = '';
  });
  function val(n) { return (form.elements[n].value || '').trim(); }

  function message() {
    var lines = ['Poštovani,', '', 'molim ponudu za sljedeće proizvode s laserskim graviranjem:', ''];
    sel.forEach(function (l, i) {
      var p = byCode[l.c], t = lineTotal(l);
      lines.push((i + 1) + '. ' + p.c + ' – ' + p.n + (l.col ? ', boja: ' + l.col : '') +
        ' – ' + (l.q ? l.q + ' kom' : 'količina ?') +
        (p.pr != null ? ' × ' + eur(p.pr) + (t != null ? ' = ' + eur(t) : '') : ''));
    });
    var g = grandTotal();
    if (g.t) lines.push('', 'Ukupno: ' + eur(g.t));
    lines.push('', '(cijene po komadu, usluga graviranja uključena je u cijenu)');
    if (val('napomena')) lines.push('', 'Napomena: ' + val('napomena'));
    var who = [];
    if (val('ime')) who.push('Ime i prezime: ' + val('ime'));
    if (val('tvrtka')) who.push('Tvrtka: ' + val('tvrtka'));
    if (val('email')) who.push('E-mail: ' + val('email'));
    if (val('tel')) who.push('Telefon: ' + val('tel'));
    if (who.length) lines.push('', who.join('\n'));
    lines.push('', 'Lijep pozdrav');
    return lines.join('\n');
  }
  function needProducts() {
    hint.className = 'hint';
    if (!sel.length) { hint.textContent = 'Najprije dodajte barem jedan proizvod u upit.'; return false; }
    var noCol = sel.filter(function (l) { return byCode[l.c].col && !l.col; });
    if (noCol.length) {
      hint.textContent = 'Odaberite boju za: ' + noCol.map(function (l) { return byCode[l.c].n; }).join(', ') + '.';
      var s0 = $('#selList select[aria-invalid="true"]'); if (s0) s0.focus();
      return false;
    }
    var miss = sel.filter(function (l) { return !l.q; });
    if (miss.length) {
      hint.textContent = 'Upišite količinu za: ' + miss.map(function (l) { return byCode[l.c].n + (l.col ? ' (' + l.col + ')' : ''); }).join(', ') + '.';
      var f = $('#selList input[aria-invalid="true"]'); if (f) f.focus();
      return false;
    }
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hint.className = 'hint'; hint.textContent = '';
    if (!needProducts()) return;
    var bad = [];
    if (!val('ime')) bad.push('ime');
    if (!val('email') && !val('tel')) bad.push('email', 'tel');
    if (val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) bad.push('email');
    if (bad.length) {
      bad.forEach(function (n) { form.elements[n].setAttribute('aria-invalid', 'true'); });
      hint.textContent = 'Upišite ime i barem e-mail ili telefon, da vam možemo poslati ponudu.';
      form.elements[bad[0]].focus();
      return;
    }
    var subject = 'Upit – ' + sel.length + ' ' + stavki(sel.length) + (val('tvrtka') ? ' – ' + val('tvrtka') : '');
    var url = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message());
    window.location.href = url;
    hint.className = 'hint ok';
    hint.textContent = url.length > 1900
      ? 'Otvara se aplikacija za poštu. Upit je dug pa ga neke aplikacije mogu skratiti – ako poruka nije potpuna, kliknite „Kopiraj upit” i zalijepite ga u e-mail.'
      : 'Otvara se vaša aplikacija za poštu s pripremljenom porukom. Ako se ništa ne otvori, kliknite „Kopiraj upit” i pošaljite ga na ' + EMAIL + '.';
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (err) { rej(err); }
      ta.remove();
    });
  }
  $('#copyBtn').addEventListener('click', function () {
    hint.textContent = '';
    if (!needProducts()) return;
    copyText(message()).then(function () {
      hint.className = 'hint ok';
      hint.textContent = 'Upit je kopiran. Zalijepite ga u poruku (WhatsApp, Viber, SMS) na ' + PHONE + ' ili u e-mail na ' + EMAIL + '.';
    }, function () {
      hint.className = 'hint';
      hint.textContent = 'Kopiranje nije uspjelo. Pokušajte ponovno ili koristite „Pošalji e-mailom”.';
    });
  });
  if (navigator.share) {
    $('#shareBtn').hidden = false;
    $('#shareBtn').addEventListener('click', function () {
      hint.textContent = '';
      if (!needProducts()) return;
      navigator.share({ title: 'Upit za cijenu – MTHtech', text: message() }).catch(function () {});
    });
  }

  // ---------- Toast ----------
  var tt;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }

  // ---------- Visina navigacije za sticky traku ----------
  var nav = $('.nav');
  function navH() { document.documentElement.style.setProperty('--navH', nav.offsetHeight + 'px'); }
  window.addEventListener('resize', navH);

  route(); navH(); syncSel();
})();
