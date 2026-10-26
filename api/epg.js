// /api/epg.js — Guide des programmes XMLTV francophone
// ?name=<chaîne>            -> { prog:{title,start,stop} }  (programme en cours)
// ?name=<chaîne>&full=1     -> { list:[{title,start,stop},...] } (toute la journée)
// ?debug=1[&name=<chaîne>]  -> diagnostic : noms présents dans le guide + chaîne retrouvée ou non
const zlib = require('zlib');

const GUIDES = [
  'https://iptv-epg.org/files/epg-fr.xml.gz',
  'https://iptv-epg.org/files/epg-fr.xml',
  'https://iptv-epg.org/files/epg-be.xml.gz',
  'https://iptv-epg.org/files/epg-ch.xml.gz',
  'https://iptv-epg.org/files/epg-ca.xml.gz'
];

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/&(amp;)?[a-z]+;/gi, ' ').replace(/[^a-z0-9]/g, '');

// Nom de l'appli -> clé de comparaison : sans (7) (6) [Not 24/7] [Geo-blocked] (720p) HD FHD 4K BACKUP…
const clean = s => norm(String(s || '')
  .replace(/\[[^\]]*\]/g, ' ')
  .replace(/\([^)]*\)/g, ' ')
  .replace(/\b(?:fhd|uhd|hd|sd|4k|h265|hevc|backup|hq|\d{3,4}p)\b/gi, ' '));

let CACHE = null, CACHE_T = 0;
const TTL = 2 * 3600 * 1000;

function esc(s) { return s ? s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim() : ''; }

// "20261024083000 +0200" -> ISO UTC
function xmltvDate(str) {
  const m = /^\s*(\d{12,14})\s*([+-]\d{4})?/.exec(str || '');
  if (!m) return null;
  const s = m[1], off = m[2];
  const y = +s.slice(0, 4), mo = +s.slice(4, 6) - 1, d = +s.slice(6, 8),
        h = +s.slice(8, 10) || 0, mi = +s.slice(10, 12) || 0, se = +s.slice(12, 14) || 0;
  let t = Date.UTC(y, mo, d, h, mi, se);
  if (off) { const sg = off[0] === '-' ? -1 : 1, oh = +off.slice(1, 3), om = +off.slice(3, 5); t -= sg * (oh * 3600 + om * 60) * 1000; }
  const dt = new Date(t);
  return isNaN(dt) ? null : dt.toISOString();
}

// Lit un attribut quel que soit l'ordre des attributs dans la balise
const attr = (s, n) => { const m = new RegExp('\\b' + n + '="([^"]*)"').exec(s); return m ? m[1] : ''; };

async function fetchXml(url, timeout) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeout || 20000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'HESTV-EPG/1.0' } });
    if (!r.ok) return null;
    let buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) return null;
    if (url.endsWith('.gz')) { try { buf = zlib.gunzipSync(buf); } catch (e) { return null; } }
    const xml = buf.toString('utf8');
    return xml.indexOf('<tv') > -1 || xml.indexOf('<programme') > -1 ? xml : null;
  } catch (e) { return null; } finally { clearTimeout(to); }
}

async function loadGuides() {
  if (CACHE && Date.now() - CACHE_T < TTL) return CACHE;
  let xml = null, src = '';
  for (const u of GUIDES) { xml = await fetchXml(u, 25000); if (xml) { src = u; break; } }
  if (!xml) return CACHE; // garde l'ancien cache en cas d'échec réseau
  const byId = {};   // id chaîne -> programmes
  const alias = {};  // nom normalisé (tous les display-name + l'id) -> id chaîne
  const labels = {}; // id chaîne -> premier nom affiché (diagnostic)
  let m;
  const reC = /<channel\b([^>]*)>([\s\S]*?)<\/channel>/g;
  while ((m = reC.exec(xml))) {
    const id = attr(m[1], 'id');
    if (!id) continue;
    const reD = /<display-name[^>]*>([\s\S]*?)<\/display-name>/g;
    let d, first = '';
    while ((d = reD.exec(m[2]))) {
      const nm = esc(d[1]);
      if (!first) first = nm;
      const k = clean(nm);
      if (k && !alias[k]) alias[k] = id;
    }
    labels[id] = first || id;
    const ki = clean(id.split('.')[0]);
    if (ki && !alias[ki]) alias[ki] = id;
  }
  let nProg = 0;
  const reP = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g;
  while ((m = reP.exec(xml))) {
    const ch = attr(m[1], 'channel');
    const t = /<title[^>]*>([\s\S]*?)<\/title>/.exec(m[2]);
    if (!ch || !t) continue;
    const it = { title: esc(t[1]), start: xmltvDate(attr(m[1], 'start')), stop: xmltvDate(attr(m[1], 'stop')) };
    if (!it.start || !it.stop) continue;
    (byId[ch] = byId[ch] || []).push(it);
    nProg++;
    if (!alias[clean(ch)]) alias[clean(ch)] = ch;
  }
  for (const k in byId) byId[k].sort((a, b) => a.start < b.start ? -1 : 1);
  CACHE = { byId, alias, labels, src, nProg }; CACHE_T = Date.now();
  return CACHE;
}

// Retrouve l'id de la chaîne dans le guide à partir du nom affiché dans l'appli
function findId(g, name) {
  const key = clean(name);
  if (!key) return null;
  if (g.alias[key] && g.byId[g.alias[key]]) return g.alias[key];
  // correspondance partielle (min. 4 caractères), on garde le nom le plus proche en longueur
  if (key.length > 3) {
    let best = null, bd = 1e9;
    for (const k in g.alias) {
      if (k.length > 3 && g.byId[g.alias[k]] && (k.indexOf(key) > -1 || key.indexOf(k) > -1)) {
        const d = Math.abs(k.length - key.length);
        if (d < bd) { bd = d; best = g.alias[k]; }
      }
    }
    if (best) return best;
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const name = (req.query.name || '').trim();
  const full = req.query.full === '1' || req.query.full === 'true';
  const debug = req.query.debug === '1';
  res.setHeader('Cache-Control', debug ? 'no-store' : 'public, max-age=300');
  if (!name && !debug) return res.status(400).json({ error: 'name requis' });
  const g = await loadGuides();
  if (!g) return res.status(502).json({ error: 'guide indisponible' });
  const id = name ? findId(g, name) : null;
  if (debug) {
    const withProg = Object.keys(g.byId).filter(k => g.byId[k].length);
    return res.json({
      source: g.src, chaines_avec_programmes: withProg.length, programmes: g.nProg,
      demande: name || null, cle: name ? clean(name) : null, trouvee: id ? (g.labels[id] || id) : null,
      noms: withProg.map(k => g.labels[k] || k).sort().slice(0, 600)
    });
  }
  const list = id ? g.byId[id] : null;
  if (!list || !list.length) return res.status(404).json({ error: 'chaîne non trouvée' });
  const now = new Date().toISOString();
  if (full) {
    const cut = now.slice(0, 10); // garder aujourd'hui (+ nuit qui suit)
    const day = list.filter(p => p.stop > now && p.start.slice(0, 10) <= cut);
    return res.json({ list: day.length ? day : list.filter(p => p.stop > now).slice(0, 40) });
  }
  let cur = list.find(p => p.start <= now && p.stop > now);
  if (!cur) { const nx = list.find(p => p.start > now); if (nx) return res.json({ prog: { title: '', start: null, stop: null, next: nx.title, nstart: nx.start } }); }
  return res.json({ prog: cur || { title: '', start: null, stop: null } });
};
