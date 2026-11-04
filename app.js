(function () {
  'use strict';
  var K = window.KATALOG;
  var EMAIL = 'info@mthtech.hr';
  var PHONE = '+385 91 474 7227';
  var LS_SEL = 'mth-upit-v1', LS_FORM = 'mth-upit-forma-v1';

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
  function eur(v) { return v == null ? '' : v.toFixed(2).replace('.', ',') + ' €'; }
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

  // ---------- Odabir ----------
  var sel = load(LS_SEL, []).filter(function (c) { return byCode[c]; });
  function isSel(code) { return sel.indexOf(code) !== -1; }
  function toggle(code) {
    var i = sel.indexOf(code);
    if (i === -1) sel.push(code); else sel.splice(i, 1);
    store(LS_SEL, sel);
    syncSel(code);
    return i === -1;
  }
  function syncSel(code) {
    if (code) {
      document.querySelectorAll('.card[data-code="' + CSS.escape(code) + '"]').forEach(function (el) {
        var on = isSel(code);
        el.classList.toggle('sel', on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
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
    $('#dockW').textContent = proizvoda(n);
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
    return '<div class="card' + (on ? ' sel' : '') + '" role="checkbox" tabindex="0" aria-checked="' + on + '" data-code="' + esc(p.c) + '" aria-label="' + esc(p.n + ', šifra ' + p.c) + '">' +
      '<div class="ph"><img loading="lazy" decoding="async" src="' + esc(p.i) + '" alt="">' +
      '<span class="check">' + ICON.check + '</span>' +
      '<button type="button" class="info" data-info="' + esc(p.c) + '" aria-label="Detalji: ' + esc(p.n) + '">' + ICON.info + '</button>' +
      '<span class="sel-tag">U upitu</span>' +
      (p.x ? '<button type="button" class="more" data-info="' + esc(p.c) + '" data-gal="1" hidden aria-label="Više slika: ' + esc(p.n) + '">' + ICON.cam + '<em></em></button>' : '') +
      '</div>' +
      '<div class="bd"><div class="nm"><b>' + esc(p.n) + '</b><span class="code">' + esc(p.c) + '</span></div>' +
      '<div class="desc">' + esc(p.d) + '</div>' +
      (p.pr != null ? '<div class="price"><b>' + eur(p.pr) + '</b><span>s PDV-om i graviranjem</span></div>' : '') +
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
        '<p>Promotivni proizvodi od drva, metala, kože i drugih materijala koje graviramo vlastitim CO2, diodnim i IR laserima. Uz svaki proizvod je cijena po komadu s PDV-om i graviranjem logotipa. Odaberite proizvode i pošaljite upit.</p>' +
        '<div class="cta-row"><button type="button" class="btn btn-lime btn-lg" data-scroll="kategorije">Pregledaj katalog ' + ICON.arrow + '</button>' +
        '<button type="button" class="btn btn-ghost btn-lg" data-scroll="kako">Kako poslati upit</button></div>' +
        '<div class="stats"><div><b>' + all.length + '</b><span>proizvoda</span></div><div><b>' + K.cats.length + '</b><span>kategorija</span></div><div><b>3</b><span>vrste lasera</span></div></div>' +
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
        '<div class="step"><h3>Odaberite proizvode</h3><p>Kliknite na proizvod i on ostaje označen. Možete birati iz više kategorija, odabir se pamti.</p></div>' +
        '<div class="step"><h3>Ispunite upit</h3><p>Gumb „Upit” gore desno prikazuje odabrane proizvode s nazivom i šifrom. Dodajte svoje podatke i napomenu.</p></div>' +
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
    if (c) {
      var added = toggle(c.dataset.code);
      toast(added ? 'Dodano u upit: ' + byCode[c.dataset.code].n : 'Uklonjeno iz upita');
      return;
    }
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
  var dlg = $('#detail');
  function openDetail(code, gal) {
    var p = byCode[code];
    var on = isSel(code);
    dlg.innerHTML = '<button class="d-x" type="button" data-close aria-label="Zatvori">' + ICON.x + '</button>' +
      '<div class="d-in"><div class="d-img"><img src="' + esc(p.i) + '" alt="' + esc(p.n) + '"></div><div class="d-bd">' +
      '<div class="eyebrow">' + p.cat.id + ' · ' + esc(p.cat.name) + '</div>' +
      '<div><h2 id="dTitle">' + esc(p.n) + '</h2><div class="code" style="margin-top:6px">Šifra ' + esc(p.c) + '</div></div>' +
      (p.pr != null ? '<div class="price price-lg"><b>' + eur(p.pr) + '</b><span>po komadu, s PDV-om i laserskim graviranjem logotipa</span></div>' : '') +
      '<p style="font:400 15.5px/1.5 var(--font-sans);color:var(--ink-700)">' + esc(p.d) + '</p>' +
      '<dl><dt>Materijal</dt><dd>' + esc(p.m) + '</dd><dt>Dimenzije</dt><dd>' + esc(p.dim) + '</dd>' +
      (p.col ? '<dt>Boje · ' + p.col.length + (p.more ? '+' : '') + '</dt><dd>' + swatches(p) + '<div style="font-size:12.5px;color:var(--ink-600);margin-top:6px">' + esc(p.col.map(function (c) { return c[0]; }).join(', ')) + '</div></dd>' : '') +
      '<dt>Laser</dt><dd>' + lasers(p) + '</dd></dl>' +
      (p.s ? '<div class="d-sg"><span class="eyebrow">Prijedlog personalizacije</span>' + esc(p.s) + '</div>' : '') +
      (p.nt ? '<p class="small">' + esc(p.nt) + '</p>' : '') +
      '<button type="button" class="btn btn-lg ' + (on ? 'btn-ghost' : 'btn-lime') + '" data-dtoggle="' + esc(p.c) + '">' + (on ? 'Ukloni iz upita' : ICON.check + ' Dodaj u upit') + '</button>' +
      '</div></div>';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
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
  function showImg(u) {
    dlg.querySelector('.d-img > img').src = u;
    dlg.querySelectorAll('[data-img]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.img === u ? 'true' : 'false'); });
  }
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); return; }
    var im = e.target.closest('[data-img]');
    if (im) { showImg(im.dataset.img); return; }
    var t = e.target.closest('[data-dtoggle]');
    if (t) { var added = toggle(t.dataset.dtoggle); toast(added ? 'Dodano u upit' : 'Uklonjeno iz upita'); dlg.close(); }
  });

  // ---------- Drawer upita ----------
  var drawer = $('#drawer'), scrim = $('#scrim'), lastFocus;
  function openInq() {
    lastFocus = document.activeElement;
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
    ul.innerHTML = sel.map(function (code) {
      var p = byCode[code];
      return '<li><span class="t"><img src="' + esc(p.i) + '" alt=""></span><div><b>' + esc(p.n) + '</b><span>' + esc(p.c) + ' · ' + esc(p.cat.name) + '</span></div>' +
        '<strong class="sel-pr">' + eur(p.pr) + '</strong>' +
        '<button type="button" data-rm="' + esc(code) + '" aria-label="Ukloni ' + esc(p.n) + '">' + ICON.x + '</button></li>';
    }).join('');
    $('#selEmpty').hidden = sel.length > 0;
    $('#clearSel').hidden = sel.length < 2;
    $('#inqTitle').textContent = sel.length ? 'Odabrano: ' + sel.length + ' ' + proizvoda(sel.length) : 'Odabrani proizvodi';
  }
  $('#selList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (b) toggle(b.dataset.rm);
  });
  $('#clearSel').addEventListener('click', function () {
    var old = sel.slice(); sel = []; store(LS_SEL, sel);
    old.forEach(syncSel); syncSel();
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
    var lines = ['Poštovani,', '', 'molim ponudu za lasersko graviranje sljedećih proizvoda:', ''];
    sel.forEach(function (code, i) { var p = byCode[code]; lines.push((i + 1) + '. ' + p.c + ' – ' + p.n + (p.pr != null ? ' – ' + eur(p.pr) : '')); });
    lines.push('', '(cijene po komadu s PDV-om, uključuju lasersko graviranje)');
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
    if (sel.length) return true;
    hint.className = 'hint'; hint.textContent = 'Najprije odaberite barem jedan proizvod u katalogu.';
    return false;
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
    var subject = 'Upit za cijenu – ' + sel.length + ' ' + proizvoda(sel.length) + (val('tvrtka') ? ' – ' + val('tvrtka') : '');
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
