/* =========================================================
   HUNTER × HUNTER — Compendium des règles
   Navigation par hash, recherche, lanceur de dés
   ========================================================= */
(function () {
  'use strict';

  var links   = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var pages   = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var sidebar = document.getElementById('sidebar');
  var scrim   = document.getElementById('scrim');
  var burger  = document.getElementById('burger');
  var footNav = document.getElementById('footNav');

  var order = links.map(function (a) { return a.getAttribute('href').slice(1); });

  /* ---------- Navigation ---------- */

  var KANJI = new RegExp('[\\u3000-\\u9fff]', 'g');
  var DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

  function labelOf(id) {
    var link = links.find(function (a) { return a.getAttribute('href') === '#' + id; });
    if (!link) return id;
    return link.textContent.replace(KANJI, '').trim();
  }

  function buildFootNav(id) {
    var i = order.indexOf(id);
    var html = '';
    if (i > 0) {
      html += '<a class="foot-link prev" href="#' + order[i - 1] + '">' +
              '<span class="foot-dir">← Précédent</span>' +
              '<span class="foot-name">' + labelOf(order[i - 1]) + '</span></a>';
    }
    if (i > -1 && i < order.length - 1) {
      html += '<a class="foot-link next" href="#' + order[i + 1] + '">' +
              '<span class="foot-dir">Suivant →</span>' +
              '<span class="foot-name">' + labelOf(order[i + 1]) + '</span></a>';
    }
    footNav.innerHTML = html;
  }

  function show(id, skipScroll) {
    var target = document.getElementById(id);
    var anchor = null;

    // Ancre interne (une technique dans un arbre) : on ouvre sa page et on la cible
    if (target && !target.classList.contains('page')) {
      var host = target.closest('.page');
      if (host) { anchor = target; target = host; id = host.id; }
    }

    if (!target || !target.classList.contains('page')) {
      id = order[0];
      target = document.getElementById(id);
    }

    pages.forEach(function (p) { p.classList.toggle('active', p === target); });
    links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });

    buildFootNav(id);
    document.title = labelOf(id) + ' — Règles du JDR Hunter × Hunter';

    if (anchor) {
      // Lire getBoundingClientRect force le recalcul de la mise en page qui vient
      // d'être invalidée par le changement de page : la position est donc à jour.
      // On positionne nous-mêmes plutôt que par scrollIntoView, qui se cale sur un
      // layout périmé. Pas de requestAnimationFrame : il ne se déclenche pas dans
      // un onglet d'arrière-plan. 'instant' court-circuite le scroll-behavior:smooth.
      var top = anchor.getBoundingClientRect().top + window.scrollY
              - (window.innerHeight / 2) + (anchor.offsetHeight / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
      anchor.classList.remove('flash');
      void anchor.offsetWidth;          // force le redémarrage de l'animation
      anchor.classList.add('flash');
    } else if (!skipScroll) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    closeMenu();
  }

  function currentId() {
    return (location.hash || '').replace('#', '');
  }

  window.addEventListener('hashchange', function () { show(currentId()); });

  /* ---------- Menu mobile ---------- */

  function openMenu() {
    sidebar.classList.add('open');
    scrim.classList.add('show');
    burger.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
    burger.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) closeMenu(); else openMenu();
  });
  scrim.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- Recherche dans le sommaire ---------- */

  var search = document.getElementById('navSearch');
  var groups = Array.prototype.slice.call(document.querySelectorAll('.nav-group'));

  function normalize(s) {
    return s.toLowerCase().normalize('NFD').replace(DIACRITICS, '');
  }

  search.addEventListener('input', function () {
    var q = normalize(search.value.trim());

    links.forEach(function (a) {
      a.classList.toggle('hidden', q !== '' && normalize(a.textContent).indexOf(q) === -1);
    });

    // Masque un intitulé de groupe si tous ses liens sont cachés
    groups.forEach(function (g) {
      var visible = false;
      var node = g.nextElementSibling;
      while (node && node.classList.contains('nav-link')) {
        if (!node.classList.contains('hidden')) { visible = true; break; }
        node = node.nextElementSibling;
      }
      g.classList.toggle('hidden', !visible);
    });
  });

  /* ---------- Démarrage ---------- */

  show(currentId(), true);
})();
