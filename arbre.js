/* =========================================================
   HUNTER × HUNTER — Arbre de Nen
   Canevas hexagonal déplaçable et zoomable, avec éditeur intégré.

   Les modifications faites dans le navigateur sont conservées dans
   localStorage. Le bouton « Exporter » produit le JSON à recopier dans
   DONNEES_DEFAUT ci-dessous pour figer un état dans le fichier.
   ========================================================= */
(function () {
  'use strict';

  var svg = document.getElementById('arbreSvg');
  if (!svg) return;

  var wrap     = document.getElementById('arbreWrap');
  var viewport = document.getElementById('arbreViewport');
  var gLiens   = document.getElementById('arbreLiens');
  var gNoeuds  = document.getElementById('arbreNoeuds');
  var panneau  = document.getElementById('arbrePanneau');
  var aide     = document.getElementById('arbreAide');

  var SVGNS = 'http://www.w3.org/2000/svg';
  var CLE   = 'hxh-arbre-nen';

  /* ---------------------------------------------------------
     DONNÉES PAR DÉFAUT
     --------------------------------------------------------- */

  var R_CAT = 300, R_ENTREE = 470, ECART = 20;

  function pos(angle, r) {
    var a = angle * Math.PI / 180;
    return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
  }

  var NATURES = [
    { id:'renforcement',   nom:'Renforcement',   kanji:'強', angle:-90,
      effet:'Renforcer ce qui existe déjà — son propre corps ou un objet.' },
    { id:'transformation', nom:'Transformation', kanji:'変', angle:-30,
      effet:'Changer la qualité de son aura pour lui faire imiter autre chose.' },
    { id:'materialisation',nom:'Matérialisation',kanji:'具', angle:30,
      effet:'Créer des objets à partir de son aura.' },
    { id:'specialisation', nom:'Spécialisation', kanji:'特', angle:90,
      effet:'Un effet unique, qui n\'entre dans aucune autre catégorie.' },
    { id:'manipulation',   nom:'Manipulation',   kanji:'操', angle:150,
      effet:'Contrôler le vivant comme l\'inanimé.' },
    { id:'emission',       nom:'Émission',       kanji:'放', angle:210,
      effet:'Détacher son aura de son corps et la projeter à distance.' }
  ];

  function donneesDefaut() {
    var noeuds = [
      { id:'hatsu', nom:'Hatsu', kanji:'発', type:'coeur', x:0, y:0, xp:0,
        effet:'Le cœur de ton Nen. Les passifs et techniques que tu conçois avec le MJ.' }
    ];
    var liens = [];

    NATURES.forEach(function (nat) {
      var p = pos(nat.angle, R_CAT);
      noeuds.push({ id:nat.id, nom:nat.nom, kanji:nat.kanji, type:'categorie',
                    nature:nat.id, x:p.x, y:p.y, xp:0, effet:nat.effet });

      [-ECART, ECART].forEach(function (d, i) {
        var q = pos(nat.angle + d, R_ENTREE);
        var id = nat.id + '-' + (i + 1);
        noeuds.push({ id:id, nom:'', type:'entree', nature:nat.id,
                      x:q.x, y:q.y, xp:0, effet:'' });
        liens.push([nat.id, id]);
      });
    });

    return { noeuds: noeuds, liens: liens };
  }

  /* ---------------------------------------------------------
     ÉTAT
     --------------------------------------------------------- */

  var etat = charger() || donneesDefaut();
  var selection = null;
  var edition = false;
  var modeLiaison = false;
  var index = {};

  function charger() {
    try {
      var brut = localStorage.getItem(CLE);
      if (!brut) return null;
      var d = JSON.parse(brut);
      if (!d || !Array.isArray(d.noeuds) || !Array.isArray(d.liens)) return null;
      return d;
    } catch (e) { return null; }
  }

  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {}
  }

  function noeud(id) { return index[id]; }

  function nouvelId(prefixe) {
    var i = 1;
    while (index[prefixe + i]) i++;
    return prefixe + i;
  }

  function liensDe(id) {
    return etat.liens.filter(function (l) { return l[0] === id || l[1] === id; });
  }

  function autreBout(l, id) { return l[0] === id ? l[1] : l[0]; }

  /* ---------------------------------------------------------
     RENDU
     --------------------------------------------------------- */

  var TAILLE = { quintessence: 112, coeur: 82, categorie: 66, entree: 34 };

  function el(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function cheminHex(r) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = (-90 + i * 60) * Math.PI / 180;
      pts.push((Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1));
    }
    return pts.join(' ');
  }

  function lignes(txt) {
    if (txt.length <= 11) return [txt];
    var mots = txt.split(' ');
    if (mots.length === 1) return [txt];
    var moitie = Math.ceil(mots.length / 2);
    return [mots.slice(0, moitie).join(' '), mots.slice(moitie).join(' ')];
  }

  function texte(contenu, x, y, cls) {
    var t = el('text', { x: x, y: y, class: cls });
    t.textContent = contenu;
    return t;
  }

  function dessiner() {
    index = {};
    etat.noeuds.forEach(function (n) { index[n.id] = n; });

    gLiens.textContent = '';
    gNoeuds.textContent = '';

    etat.liens.forEach(function (l) {
      var a = index[l[0]], b = index[l[1]];
      if (!a || !b) return;
      gLiens.appendChild(el('line', { x1:a.x, y1:a.y, x2:b.x, y2:b.y, class:'arbre-lien' }));
    });

    etat.noeuds.forEach(function (n) {
      var r = TAILLE[n.type] || TAILLE.entree;
      var vide = !n.nom;
      var g = el('g', {
        class: 'arbre-noeud arbre-' + n.type +
               (n.nature ? ' nature-' + n.nature : '') +
               (vide && n.type === 'entree' ? ' vide' : '') +
               (n.id === selection ? ' actif' : ''),
        transform: 'translate(' + n.x + ',' + n.y + ')',
        tabindex: '0', role: 'button'
      });
      g.dataset.id = n.id;

      if (n.type === 'entree') {
        g.appendChild(el('circle', { r: r, class: 'rond' }));
        if (n.nom) {
          var lp = lignes(n.nom);
          var yp = lp.length > 1 ? -12 : -4;
          lp.forEach(function (t, i) { g.appendChild(texte(t, 0, yp + i * 15, 'nom')); });
          if (n.xp) g.appendChild(texte(n.xp + ' XP', 0, lp.length > 1 ? 24 : 18, 'xp'));
        }
      } else {
        g.appendChild(el('polygon', { points: cheminHex(r), class: 'hex' }));
        // Les quintessences portent un second contour : elles se lisent comme
        // un palier au-dessus des autres hexagones, même très dézoomées.
        if (n.type === 'quintessence') {
          g.appendChild(el('polygon', { points: cheminHex(r - 12), class: 'hex-interne' }));
        }
        if (n.kanji) {
          g.appendChild(texte(n.kanji, 0,
            n.type === 'quintessence' ? 20 : n.type === 'coeur' ? 14 : 10, 'kanji'));
        }
        if (n.nom) {
          var etiq = el('text', { x: 0, y: r + 24, class: 'etiquette' });
          etiq.textContent = n.nom + (n.xp ? '  ·  ' + n.xp + ' XP' : '');
          g.appendChild(etiq);
        }
      }

      gNoeuds.appendChild(g);
    });
  }

  /* ---------------------------------------------------------
     PANNEAU : lecture ou édition
     --------------------------------------------------------- */

  function selectionner(id) {
    selection = id;
    dessiner();
    majPanneau();
  }

  function majPanneau() {
    var n = selection ? index[selection] : null;

    if (!n) {
      panneau.innerHTML = '<p class="arbre-panneau-vide">' +
        (edition ? 'Sélectionne un nœud pour le modifier, ou ajoute-en un.'
                 : 'Sélectionne un nœud pour voir son effet.') + '</p>';
      return;
    }

    if (edition) { formulaire(n); return; }

    if (!n.nom) {
      panneau.innerHTML =
        '<p class="arbre-panneau-type">Emplacement libre</p>' +
        '<h2 class="arbre-panneau-titre">' +
          (n.nature && index[n.nature] ? 'Branche ' + index[n.nature].nom : 'Nœud vide') +
        '</h2>' +
        '<p class="arbre-panneau-effet">Ce nœud reste à définir.</p>';
      return;
    }

    var typeLisible = n.type === 'categorie'    ? 'Nature du Nen'
                    : n.type === 'quintessence' ? 'Quintessence'
                    : n.type === 'coeur'        ? 'Cœur'
                    : 'Amélioration';

    panneau.innerHTML =
      '<p class="arbre-panneau-type">' + typeLisible + '</p>' +
      '<h2 class="arbre-panneau-titre">' +
        (n.kanji ? '<span class="k">' + n.kanji + '</span>' : '') + n.nom +
      '</h2>' +
      (n.xp > 0 ? '<p class="arbre-panneau-xp">' + n.xp + ' XP</p>' : '') +
      '<p class="arbre-panneau-effet">' + (n.effet || '') + '</p>';
  }

  // Construit le formulaire d'édition du nœud sélectionné
  function formulaire(n) {
    panneau.textContent = '';

    var titre = document.createElement('p');
    titre.className = 'arbre-panneau-type';
    titre.textContent = n.type === 'entree'       ? 'Cercle' :
                        n.type === 'quintessence' ? 'Quintessence' :
                        n.type === 'coeur'        ? 'Hexagone — cœur' : 'Hexagone';
    panneau.appendChild(titre);

    panneau.appendChild(champ('Titre', 'text', n.nom, function (v) {
      n.nom = v; appliquer();
    }));

    panneau.appendChild(champ('Coût en XP', 'number', n.xp || 0, function (v) {
      n.xp = parseInt(v, 10) || 0; appliquer();
    }));

    // Branche : sert au code couleur
    var wrapSel = document.createElement('label');
    wrapSel.className = 'arbre-champ';
    wrapSel.appendChild(legende('Branche'));
    var sel = document.createElement('select');
    var opts = [{ v:'', t:'— aucune —' }].concat(NATURES.map(function (x) {
      return { v:x.id, t:x.nom };
    }));
    opts.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o.v; op.textContent = o.t;
      if ((n.nature || '') === o.v) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', function () {
      n.nature = sel.value || undefined; appliquer();
    });
    wrapSel.appendChild(sel);
    panneau.appendChild(wrapSel);

    panneau.appendChild(champ('Effet', 'zone', n.effet || '', function (v) {
      n.effet = v; appliquer();
    }));

    // Liaisons
    var l = document.createElement('div');
    l.className = 'arbre-liens-liste';
    var lg = document.createElement('p');
    lg.className = 'arbre-champ-legende';
    var voisins = liensDe(n.id);
    lg.textContent = 'Liaisons (' + voisins.length + ')';
    l.appendChild(lg);

    if (!voisins.length) {
      var vide = document.createElement('p');
      vide.className = 'arbre-liens-vide';
      vide.textContent = 'Aucune. Clique « Lier » puis un autre nœud.';
      l.appendChild(vide);
    }

    voisins.forEach(function (lien) {
      var autre = index[autreBout(lien, n.id)];
      var ligne = document.createElement('div');
      ligne.className = 'arbre-lien-item';
      var nom = document.createElement('span');
      nom.textContent = autre ? (autre.nom || '(sans titre)') : '?';
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'arbre-lien-suppr';
      btn.title = 'Retirer cette liaison';
      btn.textContent = '×';
      btn.addEventListener('click', function () {
        etat.liens = etat.liens.filter(function (x) { return x !== lien; });
        appliquer(); majPanneau();
      });
      ligne.appendChild(nom); ligne.appendChild(btn);
      l.appendChild(ligne);
    });

    panneau.appendChild(l);

    var aideDep = document.createElement('p');
    aideDep.className = 'arbre-liens-vide';
    aideDep.textContent = 'Glisse le nœud sur le canevas pour le déplacer.';
    panneau.appendChild(aideDep);
  }

  function legende(txt) {
    var s = document.createElement('span');
    s.className = 'arbre-champ-legende';
    s.textContent = txt;
    return s;
  }

  function champ(nom, type, valeur, onInput) {
    var wrapC = document.createElement('label');
    wrapC.className = 'arbre-champ';
    wrapC.appendChild(legende(nom));
    var input = type === 'zone' ? document.createElement('textarea')
                                : document.createElement('input');
    if (type !== 'zone') input.type = type;
    input.value = valeur;
    input.addEventListener('input', function () { onInput(input.value); });
    wrapC.appendChild(input);
    return wrapC;
  }

  // Redessine et enregistre, sans toucher au formulaire (le focus est préservé)
  function appliquer() { dessiner(); sauver(); }

  /* ---------------------------------------------------------
     DÉPLACEMENT ET ZOOM DE LA VUE
     --------------------------------------------------------- */

  var vx = 0, vy = 0, echelle = 0.75;
  var MIN = 0.25, MAX = 2.5;

  function applique() {
    viewport.setAttribute('transform',
      'translate(' + vx + ',' + vy + ') scale(' + echelle + ')');
  }

  function taille() {
    var r = wrap.getBoundingClientRect();
    return { w: r.width || 1200, h: r.height || 800 };
  }

  function recentrer() {
    var t = taille();
    svg.setAttribute('viewBox', '0 0 ' + t.w + ' ' + t.h);
    var margeDroite = t.w > 760 ? 356 : 0;
    var utile = t.w - margeDroite;
    echelle = Math.min(1, Math.min(utile / 1200, t.h / 1150));
    vx = utile / 2;
    vy = t.h / 2;
    applique();
  }

  function zoomer(facteur, cx, cy) {
    var t = taille();
    if (cx === undefined) { cx = t.w / 2; cy = t.h / 2; }
    var ne = Math.max(MIN, Math.min(MAX, echelle * facteur));
    if (ne === echelle) return;
    vx = cx - (cx - vx) * (ne / echelle);
    vy = cy - (cy - vy) * (ne / echelle);
    echelle = ne;
    applique();
  }

  // Coordonnées monde du centre de la zone utile
  function centreMonde() {
    var t = taille();
    var utile = t.w - (t.w > 760 ? 356 : 0);
    return { x: Math.round((utile / 2 - vx) / echelle),
             y: Math.round((t.h / 2 - vy) / echelle) };
  }

  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = svg.getBoundingClientRect();
    zoomer(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  /* ---------------------------------------------------------
     POINTEUR : panoramique, sélection, déplacement de nœud
     --------------------------------------------------------- */

  var glisse = false, deplace = false, capture = false;
  var startX = 0, startY = 0, lastX = 0, lastY = 0;
  var cible = null, noeudTire = null, boutonPrincipal = false;
  var SEUIL = 4;

  // Le clic molette déclenche le défilement automatique du navigateur : on le coupe.
  svg.addEventListener('mousedown', function (e) {
    if (e.button === 1) e.preventDefault();
  });

  svg.addEventListener('pointerdown', function (e) {
    if (e.button === 2) return;                 // clic droit : on ne saisit rien
    boutonPrincipal = (e.button === 0);

    glisse = true; deplace = false; capture = false;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    var g = e.target.closest ? e.target.closest('.arbre-noeud') : null;
    cible = g;
    // Seul le bouton gauche déplace un nœud. La molette ne fait que
    // faire glisser la vue, même en mode édition.
    noeudTire = (edition && boutonPrincipal && g) ? index[g.dataset.id] : null;
  });

  svg.addEventListener('pointermove', function (e) {
    if (!glisse) return;

    if (!deplace && Math.hypot(e.clientX - startX, e.clientY - startY) > SEUIL) {
      deplace = true;
      if (!noeudTire) svg.classList.add('glisse');
      try { svg.setPointerCapture(e.pointerId); capture = true; } catch (err) {}
    }

    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;

    if (deplace && noeudTire) {
      noeudTire.x = Math.round(noeudTire.x + dx / echelle);
      noeudTire.y = Math.round(noeudTire.y + dy / echelle);
      dessiner();
    } else if (deplace) {
      vx += dx; vy += dy;
      applique();
    }
  });

  function finGlisse(e) {
    if (!glisse) return;

    // Un clic molette ne sélectionne rien : il ne sert qu'à déplacer la vue
    if (!deplace && boutonPrincipal) {
      if (cible) {
        var id = cible.dataset.id;
        if (modeLiaison && selection && id !== selection) {
          basculerLien(selection, id);
        } else {
          selectionner(id);
        }
      } else {
        selectionner(null);
      }
    } else if (deplace && noeudTire) {
      sauver();
    }

    glisse = false; cible = null; noeudTire = null;
    svg.classList.remove('glisse');
    if (capture) { try { svg.releasePointerCapture(e.pointerId); } catch (err) {} capture = false; }
  }
  svg.addEventListener('pointerup', finGlisse);
  svg.addEventListener('pointercancel', finGlisse);

  gNoeuds.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var g = e.target.closest('.arbre-noeud');
    if (g) { e.preventDefault(); selectionner(g.dataset.id); }
  });

  /* ---------------------------------------------------------
     ÉDITEUR
     --------------------------------------------------------- */

  var outilsEdition = document.getElementById('arbreOutilsEdition');
  var btnEdition    = document.getElementById('arbreEdition');
  var btnLier       = document.getElementById('arbreLier');
  var btnReset      = document.getElementById('arbreReset');
  var btnCopier     = document.getElementById('arbreCopier');
  var btnColler     = document.getElementById('arbreColler');

  /* ---------- copier / coller le contenu d'un nœud ---------- */
  // On ne copie que ce qui décrit la capacité : titre, coût, effet, kanji.
  // La position, le type et les liaisons du nœud collé ne bougent pas.
  var presse = null;

  function copier() {
    var n = index[selection];
    if (!n) return;
    presse = { nom:n.nom || '', xp:n.xp || 0, effet:n.effet || '', kanji:n.kanji || '' };
    btnColler.disabled = false;
    btnColler.title = 'Coller « ' + (presse.nom || 'contenu vide') + ' » (Ctrl+V)';
    aide.textContent = 'Copié : « ' + (presse.nom || 'contenu vide') + ' » — sélectionne un nœud puis Coller';
  }

  function coller() {
    var n = index[selection];
    if (!n || !presse) return;
    n.nom = presse.nom;
    n.xp = presse.xp;
    n.effet = presse.effet;
    if (presse.kanji) n.kanji = presse.kanji; else delete n.kanji;
    appliquer();
    majPanneau();
    aide.textContent = 'Collé dans « ' + (n.nom || 'ce nœud') + ' »';
  }

  btnCopier.addEventListener('click', copier);
  btnColler.addEventListener('click', coller);

  document.addEventListener('keydown', function (e) {
    if (!edition || !selection) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    var t = e.target;
    // On laisse le copier-coller normal aux champs de saisie
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (e.key === 'c' || e.key === 'C') { e.preventDefault(); copier(); }
    if (e.key === 'v' || e.key === 'V') { e.preventDefault(); coller(); }
  });

  function basculerLien(a, b) {
    var existant = etat.liens.filter(function (l) {
      return (l[0] === a && l[1] === b) || (l[0] === b && l[1] === a);
    })[0];
    if (existant) etat.liens = etat.liens.filter(function (l) { return l !== existant; });
    else etat.liens.push([a, b]);
    appliquer();
    majPanneau();
  }

  var PREFIXE = { entree:'c', quintessence:'q', categorie:'h' };

  function ajouter(type) {
    var c = centreMonde();
    var n = index[selection];
    // Un nœud sélectionné sert d'ancre : on place le nouveau à côté et on relie.
    // On écarte davantage les quintessences, qui sont bien plus larges.
    var ecart = type === 'quintessence' ? 260 : 150;
    var base = n ? { x: n.x + ecart, y: n.y } : c;
    var nouveau = {
      id: nouvelId(PREFIXE[type] || 'n'),
      nom: '', type: type, x: base.x, y: base.y, xp: 0, effet: ''
    };
    if (n && n.nature) nouveau.nature = n.nature;
    etat.noeuds.push(nouveau);
    if (n) etat.liens.push([n.id, nouveau.id]);
    selectionner(nouveau.id);
    sauver();
  }

  function supprimer() {
    if (!selection) return;
    var id = selection;
    etat.noeuds = etat.noeuds.filter(function (n) { return n.id !== id; });
    etat.liens  = etat.liens.filter(function (l) { return l[0] !== id && l[1] !== id; });
    selectionner(null);
    sauver();
  }

  btnEdition.addEventListener('click', function () {
    edition = !edition;
    btnEdition.classList.toggle('actif', edition);
    outilsEdition.hidden = !edition;
    modeLiaison = false;
    btnLier.classList.remove('actif');
    aide.textContent = edition
      ? 'Édition : glisse un nœud pour le déplacer · « Lier » puis un nœud pour relier'
      : 'Glisse pour te déplacer · molette pour zoomer · clique un nœud';
    majPanneau();
  });

  document.getElementById('arbreAddCercle').addEventListener('click', function () { ajouter('entree'); });
  document.getElementById('arbreAddHex').addEventListener('click', function () { ajouter('categorie'); });
  document.getElementById('arbreAddQuint').addEventListener('click', function () { ajouter('quintessence'); });
  document.getElementById('arbreSupprimer').addEventListener('click', supprimer);

  btnLier.addEventListener('click', function () {
    modeLiaison = !modeLiaison;
    btnLier.classList.toggle('actif', modeLiaison);
    if (modeLiaison) {
      aide.textContent = selection
        ? 'Clique les nœuds à relier ou délier avec « ' + (index[selection].nom || 'la sélection') + ' »'
        : 'Sélectionne d\'abord un nœud, puis clique ceux à relier';
    } else {
      aide.textContent = 'Édition : glisse un nœud pour le déplacer · « Lier » puis un nœud pour relier';
    }
  });

  /* ---------- export / import / réinitialisation ---------- */

  var dlg       = document.getElementById('arbreDialogue');
  var dlgTitre  = document.getElementById('arbreDialogueTitre');
  var dlgAide   = document.getElementById('arbreDialogueAide');
  var dlgTexte  = document.getElementById('arbreDialogueTexte');
  var dlgOk     = document.getElementById('arbreDialogueOk');
  var voile     = document.getElementById('arbreVoile');

  var cfm       = document.getElementById('arbreConfirm');
  var cfmTitre  = document.getElementById('arbreConfirmTitre');
  var cfmTexte  = document.getElementById('arbreConfirmTexte');
  var cfmOui    = document.getElementById('arbreConfirmOui');
  var cfmNon    = document.getElementById('arbreConfirmNon');

  function fermerModales() {
    dlg.hidden = true;
    cfm.hidden = true;
    voile.hidden = true;
  }

  // Demande une confirmation avant une action destructrice
  function confirmer(titre, message, onOui) {
    cfmTitre.textContent = titre;
    cfmTexte.textContent = message;
    cfmOui.onclick = function () { fermerModales(); onOui(); };
    voile.hidden = false;
    cfm.hidden = false;
    cfmNon.focus();
  }

  cfmNon.addEventListener('click', fermerModales);
  voile.addEventListener('click', fermerModales);

  function ouvrirDialogue(titre, aideTxt, contenu, lectureSeule, action) {
    dlgTitre.textContent = titre;
    dlgAide.textContent = aideTxt;
    dlgTexte.value = contenu;
    dlgTexte.readOnly = !!lectureSeule;
    dlgOk.hidden = !action;
    dlgOk.onclick = action || null;
    voile.hidden = false;
    dlg.hidden = false;
    dlgTexte.focus();
    if (lectureSeule) dlgTexte.select();
  }

  document.getElementById('arbreExport').addEventListener('click', function () {
    ouvrirDialogue('Exporter',
      'Recopie ce JSON dans DONNEES_DEFAUT de arbre.js pour le figer dans le fichier.',
      JSON.stringify(etat, null, 2), true, null);
  });

  document.getElementById('arbreImport').addEventListener('click', function () {
    ouvrirDialogue('Importer', 'Colle ici un JSON exporté, puis applique.', '', false,
      function () {
        try {
          var d = JSON.parse(dlgTexte.value);
          if (!d || !Array.isArray(d.noeuds) || !Array.isArray(d.liens)) {
            throw new Error('structure invalide');
          }
          etat = d;
          selection = null;
          appliquer();
          majPanneau();
          fermerModales();
        } catch (err) {
          dlgAide.textContent = 'JSON invalide : ' + err.message;
        }
      });
  });

  document.getElementById('arbreDialogueFermer').addEventListener('click', fermerModales);

  btnReset.addEventListener('click', function () {
    confirmer(
      'Réinitialiser l\'arbre ?',
      'Tes ' + etat.noeuds.length + ' nœuds et ' + etat.liens.length + ' liaisons seront ' +
      'remplacés par l\'arbre d\'origine. Cette action est irréversible — pense à exporter ' +
      'ton travail avant si tu veux le garder.',
      function () {
        etat = donneesDefaut();
        selection = null;
        appliquer();
        recentrer();
        majPanneau();
        aide.textContent = 'Arbre réinitialisé.';
      });
  });

  /* ---------------------------------------------------------
     OUTILS DE VUE ET DÉMARRAGE
     --------------------------------------------------------- */

  document.getElementById('arbreZoomPlus').addEventListener('click', function () { zoomer(1.25); });
  document.getElementById('arbreZoomMoins').addEventListener('click', function () { zoomer(0.8); });
  document.getElementById('arbreRecentrer').addEventListener('click', recentrer);

  window.addEventListener('resize', function () {
    var t = taille();
    svg.setAttribute('viewBox', '0 0 ' + t.w + ' ' + t.h);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (!dlg.hidden || !cfm.hidden)) fermerModales();
  });

  dessiner();

  var initialise = false;
  window.ArbreNen = {
    afficher: function () {
      if (!initialise) { initialise = true; recentrer(); }
      else { var t = taille(); svg.setAttribute('viewBox', '0 0 ' + t.w + ' ' + t.h); }
    }
  };

  if (!document.getElementById('sectionArbres').hidden) window.ArbreNen.afficher();
})();
