/* perso.js — « Ma playlist » : chacun ajoute SA propre playlist M3U (lien https, contenu collé ou fichier).
   Elle reste uniquement sur l'appareil de la personne (localStorage) : rien n'est envoyé ni enregistré sur le serveur,
   les autres visiteurs ne la voient pas. Chargé automatiquement par auth.js. */
(() => {
'use strict';
const KEY = 'hpl';
const q = s => document.querySelector(s);
const ld = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const st = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; } };
const hh = s => { let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(36); };
const PMAP = new Map();                 // clé "_<hash>" -> url du flux
const PAGES = /(^|\.)(youtube\.com|youtu\.be|twitch\.tv|dailymotion\.com|facebook\.com)$/i;
LNAME.perso = 'Ma playlist';

/* --- lecture d'une playlist M3U --- */
function parse(text) {
  const out = [], sk = { http: 0, page: 0, ref: 0 };
  let cur = null;
  String(text).split(/\r?\n/).forEach(l => {
    l = l.trim();
    if (l.startsWith('#EXTINF')) {
      const rest = l.replace(/="[^"]*"/g, '=""');
      cur = {
        n: rest.slice(rest.lastIndexOf(',') + 1).replace(/[\u24B6-\u24E9]/g, '').trim(),
        g: (l.match(/group-title="([^"]*)"/) || [])[1] || '',
        l: (l.match(/tvg-logo="([^"]*)"/) || [])[1] || ''
      };
    } else if (cur && /^#EXTVLCOPT:http-(referrer|referer)=/i.test(l)) {
      cur.ref = 1;
    } else if (l && l[0] !== '#' && cur) {
      if (/^https:\/\//i.test(l)) {
        let host = ''; try { host = new URL(l).hostname; } catch (e) {}
        if (cur.ref) sk.ref++;
        else if (PAGES.test(host)) sk.page++;
        else if (cur.n) out.push({ n: cur.n, g: cur.g, l: /^https:\/\//i.test(cur.l) ? cur.l : '', u: l });
      } else sk.http++;
      cur = null;
    }
  });
  return { out, sk };
}

/* --- les chaînes de « Ma playlist » rejoignent la liste du Direct --- */
const _ll = window.liveList;
window.liveList = async function () {
  const ok = await _ll.apply(this, arguments);
  const P = ld();
  if (!P.length) return ok;
  PMAP.clear();
  const add = P.map(x => {
    const k = '_' + hh(x.u);
    PMAP.set(k, x.u);
    return ['p' + k, x.n, x.g || 'Ma playlist', x.l || '', 0, 'perso'];
  });
  VCH = ok ? VCH.concat(add) : add;
  return true;
};
/* lecture : les ids « p… » sont résolus ici, sans passer par le serveur */
const _f = window.fetch;
window.fetch = function (u) {
  try {
    if (typeof u === 'string' && u.indexOf('/api/iptv?id=') === 0) {
      const k = decodeURIComponent(u.slice(13).split('&')[0]), url = PMAP.get(k);
      if (url) return Promise.resolve(new Response(JSON.stringify({ url }), { headers: { 'Content-Type': 'application/json' } }));
    }
  } catch (e) {}
  return _f.apply(this, arguments);
};
/* logo cassé : on garde la chaîne et on affiche ses initiales */
const _lgE = window.lgE;
window.lgE = function (i, t) {
  const li = i.closest('.li'), cs = i.closest('.cs'), id = (li && li.dataset.id) || (cs && cs.dataset.id);
  if (id && id[0] === 'p') { i.outerHTML = '<div class="cl">' + t + '</div>'; return; }
  return _lgE.apply(this, arguments);
};

/* --- écran « Ma playlist » --- */
const css = document.createElement('style');
css.textContent = `
#plp{position:absolute;inset:0;z-index:66;background:var(--bg);display:none;flex-direction:column;padding:56px 20px 24px;overflow-y:auto;text-align:left}#plp.on{display:flex}
#plp h2{margin:0 0 6px;font-size:20px}#plp p{max-width:none;margin:0 0 10px}
#plp .x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:0;background:var(--card);color:var(--txt);font-size:16px;cursor:pointer}
#plp textarea{width:100%;min-height:130px;resize:vertical;background:var(--card);border:1px solid var(--line);border-radius:10px;color:var(--txt);font:inherit;font-size:13px;padding:10px;outline:0}
#plp textarea:focus{border-color:var(--red)}
#plp input[type=file]{width:100%;margin:10px 0 0;color:var(--mut);font-size:13px}
#plp .dst{font-size:13px;color:var(--mut);margin:10px 0 0}#plp .dst.ok{color:#1db954}#plp .dst.er{color:#ff5252}
`;
document.head.appendChild(css);

function count() {
  const e = q('#plc'); if (!e) return;
  const n = ld().length;
  e.textContent = n ? n + ' chaîne' + (n > 1 ? 's' : '') + ' dans votre playlist (stockées sur cet appareil).' : 'Aucune playlist ajoutée pour le moment.';
  const b = q('#plx'); if (b) b.style.display = n ? 'block' : 'none';
}
function msg(t, cls) { const m = q('#plm'); if (m) { m.className = 'dst ' + (cls || ''); m.textContent = t; } }

async function add() {
  const t = q('#plt').value.trim(), f = q('#plf').files[0];
  let txt = '';
  msg('Lecture…');
  try {
    if (f) txt = await f.text();
    else if (/^https:\/\/\S+$/i.test(t)) {
      const r = await fetch(t);
      if (!r.ok) throw new Error('http ' + r.status);
      txt = await r.text();
    } else if (/^http:\/\/\S+$/i.test(t)) {
      msg("Un lien en http:// est bloqué par le navigateur sur un site https. Collez le contenu de la playlist ou choisissez le fichier.", 'er');
      return;
    } else txt = t;
  } catch (e) {
    msg("Impossible de lire ce lien depuis le navigateur (le serveur de la playlist ne l'autorise pas, ou il est inaccessible). Ouvrez-le, copiez le contenu et collez-le ici, ou choisissez le fichier.", 'er');
    return;
  }
  if (!/#EXTINF/i.test(txt)) { msg("Aucune chaîne trouvée : ce n'est pas une playlist M3U.", 'er'); return; }
  const { out, sk } = parse(txt);
  const ign = [];
  if (sk.http) ign.push(sk.http + ' en http:// (bloquées par le navigateur)');
  if (sk.page) ign.push(sk.page + ' pages YouTube/Twitch/Dailymotion (non lisibles)');
  if (sk.ref) ign.push(sk.ref + ' exigeant un Referer (impossible depuis un navigateur)');
  if (!out.length) { msg('Aucune chaîne utilisable. Ignorées : ' + (ign.join(', ') || 'aucune') + '.', 'er'); return; }
  const cur = ld(), seen = new Set(cur.map(x => x.u));
  let n = 0;
  out.forEach(x => { if (!seen.has(x.u)) { seen.add(x.u); cur.push(x); n++; } });
  if (!st(cur)) { msg("Mémoire de l'appareil pleine : supprimez une playlist avant d'en ajouter une autre.", 'er'); return; }
  msg(n + ' chaîne' + (n > 1 ? 's' : '') + ' ajoutée' + (n > 1 ? 's' : '') + (ign.length ? '. Ignorées : ' + ign.join(', ') : '') + '. Elles sont dans le Direct, filtre « Ma playlist ».', 'ok');
  q('#plt').value = ''; q('#plf').value = '';
  count();
  lc = 'perso';
  if (cur_screen() === 's18') live();
}
const cur_screen = () => { try { return cur; } catch (e) { return ''; } };

window.plOpen = function () {
  let d = q('#plp');
  if (!d) {
    d = document.createElement('div'); d.id = 'plp'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Ma playlist');
    d.innerHTML = `<button class="x" type="button" aria-label="Fermer" onclick="plClose()">✕</button>
<h2>Ma playlist</h2>
<p>Ajoutez votre propre playlist M3U : lien https, contenu collé ou fichier. Elle reste uniquement sur cet appareil : rien n'est envoyé au serveur et les autres visiteurs ne la voient pas. N'ajoutez que des playlists dont vous avez le droit d'utiliser les flux.</p>
<textarea id="plt" placeholder="Collez ici un lien https://… ou le contenu de la playlist (#EXTM3U …)"></textarea>
<input id="plf" type="file" accept=".m3u,.m3u8,.txt,text/plain,audio/x-mpegurl,application/vnd.apple.mpegurl">
<button class="btn" type="button" id="pla">Ajouter</button>
<p class="dst" id="plm"></p>
<p class="dst" id="plc"></p>
<button class="btn g" type="button" id="plx" style="display:none">Tout supprimer</button>`;
    q('#app').appendChild(d);
    q('#pla').onclick = add;
    q('#plx').onclick = () => {
      if (!window.confirm('Supprimer toutes les chaînes de votre playlist ?')) return;
      st([]); PMAP.clear(); count(); msg('Playlist supprimée.', 'ok');
      if (cur_screen() === 's18') live();
    };
  }
  d.classList.add('on'); count();
};
window.plClose = function () { const d = q('#plp'); if (d) d.classList.remove('on'); };

/* entrée dans les Paramètres */
const _set = window.settings;
window.settings = function () {
  _set.apply(this, arguments);
  const h = [...document.querySelectorAll('#s17 h3')].find(x => x.textContent.trim() === 'Compte');
  if (h) h.insertAdjacentHTML('beforebegin', `<h3>Ma playlist</h3><div class="it" onclick="plOpen()"><b style="font-weight:600">Ajouter ma playlist M3U</b><span>${ld().length ? ld().length + ' ›' : '›'}</span></div>`);
};
})();
