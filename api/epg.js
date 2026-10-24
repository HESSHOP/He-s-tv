// /api/epg.js — Guide des programmes XMLTV francophone
// ?name=<chaîne>            -> { prog:{title,start,stop} }  (programme en cours)
// ?name=<chaîne>&full=1     -> { list:[{title,start,stop},...] } (toute la journée)
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

let CACHE = null, CACHE_T = 0;
const TTL = 2 * 3600 * 1000;

function esc(s) { return s ? s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim() : ''; }

// "20261024083000 +0200" -> ISO UTC
function xmltvDate(s, off) {
  if (!s || s.length < 12) return null;
  let y = +s.slice(0, 4), mo = +s.slice(4, 6) - 1, d = +s.slice(6, 8),
      h = +s.slice(8, 10) || 0, mi = +s.slice(10, 12) || 0, se = +s.slice(12, 14) || 0;
  let t = Date.UTC(y, mo, d, h, mi, se);
  if (off) { const sg = off[0] === '-' ? -1 : 1, oh = +off.slice(1, 3), om = +off.slice(3, 5); t -= sg * (oh * 3600 + om * 60) * 1000; }
  const dt = new Date(t);
  return isNaN(dt) ? null : dt.toISOString();
}

async function fetchXml(url, timeout) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeout || 20000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'HESTV-EPG/1.0' } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) return null;
    if (url.endsWith('.gz')) { try { buf = zlib.gunzipSync(buf); } catch (e) { return null; } }
    const xml = buf.toString('utf8');
    return xml.indexOf('<tv') > -1 || xml.indexOf('<programme') > -1 ? xml : null;
  } catch (e) { return null; } finally { clearTimeout(to); }
}

async function loadGuides() {
  if (CACHE && Date.now() - CACHE_T < TTL) return CACHE;
  let xml = null;
  for (const u of GUIDES) { xml = await fetchXml(u, 25000); if (xml) break; }
  if (!xml) return CACHE; // garde l'ancien cache en cas d'échec réseau
  const names = {};          // id chaîne -> nom affiché
  const byId = {}, byName = {};
  let m;
  const reC = /<channel[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/g;
  while ((m = reC.exec(xml))) {
    const id = m[1];
    const dn = /<display-name[^>]*>([\s\S]*?)<\/display-name>/.exec(m[2]);
    const nm = esc(dn ? dn[1] : id);
    names[id] = nm;
    byName[norm(nm)] = byName[norm(nm)] || [];
  }
  const reP = /<programme[^>]*\bchannel="([^"]+)"[^>]*?\bstart="(\d{8}\d{6})\s*([+-]\d{4})?"[^>]*?\bstop="(\d{8}\d{6})\s*([+-]\d{4})?"[^>]*>([\s\S]*?)<\/programme>/g;
  while ((m = reP.exec(xml))) {
    const t = /<title[^>]*>([\s\S]*?)<\/title>/.exec(m[6]);
    if (!t) continue;
    const it = { title: esc(t[1]), start: xmltvDate(m[2], m[3]), stop: xmltvDate(m[4], m[5]) };
    if (!it.start || !it.stop) continue;
    const ch = m[1];
    (byId[ch] = byId[ch] || []).push(it);
    const nm = names[ch];
    if (nm) (byName[norm(nm)] = byName[norm(nm)] || []).push(it);
  }
  for (const k in byId) byId[k].sort((a, b) => a.start < b.start ? -1 : 1);
  for (const k in byName) byName[k].sort((a, b) => a.start < b.start ? -1 : 1);
  CACHE = { byId, byName }; CACHE_T = Date.now();
  return CACHE;
}

// Retrouve la liste de programmes d'une chaîne à partir de son nom
function findList(g, name) {
  const key = norm(name);
  if (!key) return null;
  if (g.byName[key] && g.byName[key].length) return g.byName[key];
  // correspondance partielle : le nom contient la clé ou l'inverse
  for (const k in g.byName) {
    if (k.length > 3 && (k.indexOf(key) > -1 || key.indexOf(k) > -1)) {
      if (g.byName[k].length) return g.byName[k];
    }
  }
  // ids du type "fr.tf1" / "TF1.fr" contenant le nom
  for (const id in g.byId) {
    if (norm(id).indexOf(key) > -1 && g.byId[id].length) return g.byId[id];
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  const name = (req.query.name || '').trim();
  const full = req.query.full === '1' || req.query.full === 'true';
  if (!name) return res.status(400).json({ error: 'name requis' });
  const g = await loadGuides();
  if (!g) return res.status(502).json({ error: 'guide indisponible' });
  const list = findList(g, name);
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
