// API IPTV pour HE'S TV — sources : https://github.com/iptv-org/iptv (flux) + https://github.com/iptv-org/database (langues, logos)
//   /iptv?list=1  -> {groups, channels:[{id,name,group,logo,fr}]}   (fr:1 = francophone)
//   /iptv?id=<id> -> {url:"<m3u8>"}
//   /iptv?logos=1 -> {clé de nom: url du logo}  (pour compléter les chaînes d'autres sources)
// Une chaîne sans logo n'est jamais listée.
// Env optionnelles :
//   IPTV_SOURCES    liste de playlists séparées par des virgules (remplace les défauts)
//   IPTV_MAX        nb max de chaînes francophones (défaut 900)
//   IPTV_MAX_OTHER  nb max de chaînes des autres langues (défaut 1200) ; 0 = désactiver
//   IPTV_BUDGET_MS  temps max de vérification des flux (défaut 15000). Les flux non vérifiés à temps sont quand même listés
//                   (iptv-org teste déjà ses flux chaque jour) : la liste n'est jamais vide.

const BASE = 'https://iptv-org.github.io/iptv/';
const FR_SOURCES = [
  'countries/fr', 'countries/be', 'countries/ch', 'countries/ga', 'countries/sn', 'countries/ci', 'countries/cm',
  'countries/cd', 'countries/cg', 'countries/ml', 'countries/bf', 'countries/bj', 'countries/tg', 'countries/ne',
  'countries/gn', 'countries/td', 'countries/cf', 'countries/rw', 'countries/bi', 'countries/mg', 'countries/km',
  'countries/dj', 'countries/sc', 'countries/ht', 'countries/lu', 'countries/mc', 'languages/fra',
  'categories/animation', 'categories/comedy', 'categories/series', 'categories/movies', 'categories/sports',
  'categories/kids', 'categories/news', 'categories/documentary', 'categories/music', 'categories/entertainment'
].map(p => BASE + p + '.m3u');
const OTHER_SOURCES = [BASE + 'index.m3u']; // toutes les chaînes (autres langues)
const DB = 'https://iptv-org.github.io/api/';

const FAKE_PAT = /\b(test|fake|adult|xxx|erp|promo|advertising|placeholder|offline|demo)\b|18\+/i;

// Pays francophones (code ISO du tvg-id)
const FRA_TLDS = new Set(['fr','be','ch','ca','lu','mc','ga','sn','ci','cm','cd','cg','ml','bf','bj','tg','ne','gn','td','cf','rw','bi','mg','km','dj','sc','ht','pf','nc','wf','vu']);
// Pays où le français n'est pas la seule langue : on exige alors la langue "fra" de la base iptv-org
const MIXED = new Set(['be','ch','ca','lu','rw','bi','mg','km','dj','sc','vu']);
// Repli si la base de langues est inaccessible
const FR_NAME_PAT = /(tf1|france ?[2-5]|france ?24|m6\b|w9|tmc|tfx|6ter|gulli|c8\b|cstar|cnews|bfm|lci|arte|rmc|canal\+|novela|télétoon|teletoon|piwi|game ?one|j-?one|tv5|rti ?1|rts ?1|antenne ?a|gabon|a\+|comedie|comédie)/i;

const cleanName = s => {
  let n = String(s || '').trim();
  for (const r of [
    /^\[?[A-Z]{2,3}\]?\s*[|•·\-]\s*/i,
    /\s*[|•·]\s*[A-Z]{2,3}\s*$/i,
    /\s*\((?:FR|FRA|France|Gabon|GA|HD|FHD|4K|SD)\)\s*$/i,
    /\s+\(?\d{3,4}p\)?$/i,
    /\s*\[\d{3,4}p\]\s*$/i,
    /\s+(?:HD|FHD|UHD|4K|SD|H265|HEVC|Back ?up)$/i,
    /^\d+\s*[.\-]\s*/,
    /[*✳✱]\s*$/
  ]) n = n.replace(r, '');
  return n.trim().replace(/\s+/g, ' ');
};
const normKey = n => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
// Clé « de base » d'une chaîne : sans (1) (7) (BACKUP), HD, FHD, 4K… (même fonction côté application)
const baseKey = n => normKey(String(n || '').replace(/\((?:\d+|backup)\)/gi, ' ').replace(/\b(?:fhd|uhd|hd|sd|4k|h265|hevc|backup|hq)\b/gi, ' '));

const GROUP_MAP = {
  news: 'Info', 'news & politics': 'Info', politics: 'Info', weather: 'Info', legislative: 'Info', public: 'Info',
  movies: 'Cinéma', 'movies & series': 'Cinéma', classic: 'Cinéma',
  series: 'Novelas & Séries',
  animation: 'Animés', anime: 'Animés',
  sports: 'Sport', sport: 'Sport', outdoor: 'Sport', fight: 'Sport',
  kids: 'Jeunesse', family: 'Jeunesse', child: 'Jeunesse', children: 'Jeunesse',
  documentary: 'Documentaires', 'science & nature': 'Documentaires', science: 'Documentaires', history: 'Documentaires', education: 'Documentaires',
  music: 'Musique',
  comedy: 'Rire & Comédie',
  entertainment: 'Divertissement', lifestyle: 'Divertissement', talk: 'Divertissement', travel: 'Divertissement', relax: 'Divertissement',
  general: 'Généralistes', 'general & entertainment': 'Généralistes', culture: 'Culture', religious: 'Culture',
  cooking: 'Cuisine', food: 'Cuisine', auto: 'Auto', 'auto & vehicle': 'Auto',
  business: 'Éco', shop: 'Shopping'
};
// group-title peut contenir plusieurs catégories séparées par « ; » : on prend la première connue
const mapGroup = g => {
  for (const p of String(g || '').split(';')) {
    const m = GROUP_MAP[p.trim().toLowerCase()];
    if (m) return m;
  }
  return 'Autres';
};

// Identifiant stable (hash de l'URL du flux) : identique d'une instance serveur à l'autre
const hashId = s => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
};

const getJSON = async (url, ms = 15000) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error('http_' + r.status);
  return r.json();
};

// Base iptv-org : langues par chaîne (feeds.json) + meilleur logo par chaîne (logos.json). Cache 24 h.
let db = { t: 0, ok: false, fra: new Set(), known: new Set(), lang: new Map(), logos: new Map() };
async function loadDb() {
  if (db.t && Date.now() - db.t < 864e5) return db;
  const [feeds, logos] = await Promise.all([
    getJSON(DB + 'feeds.json').catch(() => null),
    getJSON(DB + 'logos.json').catch(() => null)
  ]);
  const fra = new Set(), known = new Set(), lang = new Map();
  if (Array.isArray(feeds)) feeds.forEach(f => {
    if ((f.languages || []).length) {
      known.add(f.channel);
      if (!lang.has(f.channel) || f.is_main) lang.set(f.channel, f.languages[0]);
    }
    if ((f.languages || []).includes('fra')) fra.add(f.channel);
  });
  // Même règle qu'iptv-org : PNG d'abord, puis JPEG, puis les autres, SVG en dernier ; taille proche de 512 px
  const level = { PNG: 3, JPEG: 2, APNG: 1, WebP: 1, AVIF: 1, GIF: 1, SVG: 0 };
  const score = l => (l.in_use ? 10 : 0) + (level[l.format] != null ? level[l.format] : 0) + (l.feed ? 0 : 0.5) - (Math.abs(512 - (l.width || 0)) + Math.abs(512 - (l.height || 0))) / 4096;
  const best = new Map();
  if (Array.isArray(logos)) logos.forEach(l => {
    if (!l.channel || !/^https?:\/\//i.test(l.url || '')) return;
    const s = score(l), p = best.get(l.channel);
    if (!p || s > p.s) best.set(l.channel, { s, url: l.url });
  });
  const map = new Map();
  best.forEach((v, k) => map.set(k, v.url));
  const next = { t: Date.now(), ok: fra.size > 0, fra, known, lang, logos: map };
  if (fra.size || map.size) db = next; else db = { ...db, t: Date.now() - 864e5 + 6e5 }; // base injoignable : on réessaie dans 10 min
  return db;
}

function parseM3U(text) {
  const out = [];
  let cur = null;
  String(text).split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (line.startsWith('#EXTINF')) {
      cur = {
        name: line.slice(line.lastIndexOf(',') + 1).trim(),
        tvgId: (line.match(/tvg-id="([^"]*)"/) || [])[1] || '',
        logo: (line.match(/tvg-logo="([^"]*)"/) || [])[1] || '',
        group: (line.match(/group-title="([^"]*)"/) || [])[1] || '',
        ref: ''
      };
    } else if (cur && line.startsWith('#EXTVLCOPT:http-referrer=')) {
      cur.ref = line.slice(25);
    } else if (line && !line.startsWith('#') && cur) {
      if (/^https:\/\//i.test(line) && cur.name) out.push({ ...cur, url: line });
      cur = null;
    }
  });
  return out;
}

// Étape 1 (rapide, sans vérification des flux) : playlists + langues + logos, dédoublonnées. Cache 6 h.
let all = { t: 0, fr: [], other: [], byId: new Map(), names: {} };
const TTL = 6 * 3600 * 1000;
let allP = null;
function loadAll() {
  if (all.t && Date.now() - all.t < TTL) return Promise.resolve(all);
  allP = allP || buildAll().finally(() => { allP = null; });
  return allP;
}
async function buildAll() {
  const custom = (process.env.IPTV_SOURCES || '').split(',').map(s => s.trim()).filter(Boolean);
  const maxOther = +(process.env.IPTV_MAX_OTHER === undefined ? 1200 : process.env.IPTV_MAX_OTHER);
  const urls = custom.length ? custom : [...FR_SOURCES, ...(maxOther > 0 ? OTHER_SOURCES : [])];
  // La base (langues + logos, ~9 Mo) ne doit jamais bloquer la liste : au-delà de 6 s on continue sans elle
  const dbQ = Promise.race([loadDb(), new Promise(r => setTimeout(() => r(db), 6000))]);
  const [d, plays] = await Promise.all([
    dbQ,
    Promise.all(urls.map(async u => {
      try {
        const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
        return r.ok ? parseM3U(await r.text()) : [];
      } catch (e) { return []; }
    }))
  ]);

  const seen = new Set(), fr = [], other = [], byId = new Map(), names = {};
  plays.flat().forEach(c => {
    c.name = cleanName(c.name);
    if (!c.name || FAKE_PAT.test(c.name) || /\bradio\b/i.test(c.name)) return;
    const base = (c.tvgId || '').split('@')[0];
    // Logo obligatoire : une chaîne sans logo n'est jamais listée
    c.logo = (c.logo && /^https?:\/\//i.test(c.logo) && c.logo) || d.logos.get(base) || '';
    if (!c.logo) return;
    c.logo = c.logo.replace(/^http:\/\//i, 'https://');
    const key = baseKey(c.name);
    if (!key) return;
    if (!names[key]) names[key] = c.logo; // table nom -> logo (sert à compléter d'autres sources, ex. Vavoo)
    const tld = base.includes('.') ? base.split('.').pop().toLowerCase() : '';
    // Langue connue dans la base : on s'y fie (évite les chaînes de la diaspora classées « françaises »).
    // Sinon : pays francophone non mixte ; sans base du tout : pays ou nom typique.
    const isFr = d.ok
      ? (d.known.has(base) ? d.fra.has(base) : FRA_TLDS.has(tld) && !MIXED.has(tld))
      : FRA_TLDS.has(tld) || FR_NAME_PAT.test(c.name);
    if (seen.has(key)) return;
    // Autres langues : un navigateur ne peut pas envoyer de « Referer » imposé, ces flux échoueraient
    if (!isFr && c.ref) return;
    seen.add(key);
    c.group = mapGroup(c.group);
    c.fr = isFr ? 1 : 0;
    c.lang = isFr ? 'fra' : (d.lang.get(base) || '');
    let id = hashId(c.url);
    while (byId.has(id) && byId.get(id) !== c.url) id += 'x';
    c.id = id;
    byId.set(id, c.url);
    (isFr ? fr : other).push(c);
  });
  all = { t: d.ok ? Date.now() : Date.now() - TTL + 6e5, fr, other, byId, names }; // base de langues absente : on recalcule dans 10 min
  return all;
}

async function checkAlive(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
    if (r.ok || r.status === 206 || r.status === 416 || r.status === 403 || r.status === 453) return true;
    if (r.status === 404 || r.status === 410) return false;
    const r2 = await fetch(url, { headers: { Range: 'bytes=0-255' }, redirect: 'follow', signal: AbortSignal.timeout(5000) });
    return r2.status < 500;
  } catch (e) { return false; }
}

// Vérifie les flux en parallèle (80 à la fois) jusqu'à `cap` vivants ou la fin du temps imparti.
// Retourne les flux vivants et ceux qui n'ont pas pu être vérifiés à temps (conservés, jamais perdus).
async function aliveFilter(list, cap, deadline) {
  const alive = [];
  let i = 0;
  const worker = async () => {
    while (i < list.length && alive.length < cap && Date.now() < deadline) {
      const c = list[i++];
      if (await checkAlive(c.url)) alive.push(c);
    }
  };
  await Promise.all(Array.from({ length: 80 }, worker));
  return { alive: alive.slice(0, cap), rest: alive.length >= cap ? [] : list.slice(i) };
}

let listCache = { t: 0, d: null };
let building = null;
async function buildList() {
  const a = await loadAll();
  const budget = +(process.env.IPTV_BUDGET_MS || 15000), start = Date.now();
  const maxFr = +(process.env.IPTV_MAX || 900), maxOther = +(process.env.IPTV_MAX_OTHER === undefined ? 1200 : process.env.IPTV_MAX_OTHER);
  const byName = (x, y) => x.group.localeCompare(y.group, 'fr') || x.name.localeCompare(y.name, 'fr');
  const pick = (r, cap) => [...r.alive.sort(byName), ...r.rest.slice(0, Math.max(0, cap - r.alive.length)).sort(byName)];
  const fr = await aliveFilter(a.fr, maxFr, start + budget * 0.6);
  const oth = maxOther > 0
    ? await aliveFilter(a.other.slice().sort((x, y) => (y.logo ? 1 : 0) - (x.logo ? 1 : 0)), maxOther, start + budget)
    : { alive: [], rest: [] };
  const list = [...pick(fr, maxFr), ...pick(oth, maxOther)];
  const d = {
    groups: [...new Set(list.map(c => c.group))].sort((x, y) => x.localeCompare(y, 'fr')),
    channels: list.map(c => ({ id: c.id, name: c.name, group: c.group, logo: c.logo, fr: c.fr, lang: c.lang }))
  };
  // Liste vide ou réduite (réseau en panne) : on ne la garde que 5 min, sinon 6 h
  listCache = { t: list.length > 50 ? Date.now() : Date.now() - TTL + 3e5, d };
  return d;
}

function send(res, d) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(d);
}

module.exports = async (req, res) => {
  const q = req.query || {};
  try {
    if (q.id !== undefined) {
      const a = await loadAll();
      const url = a.byId.get(String(q.id));
      return url ? res.status(200).json({ url }) : res.status(404).json({ success: false });
    }
    if (q.logos) { const a = await loadAll(); return send(res, a.names); } // {clé de nom: url du logo}
    if (!q.list) return res.status(400).json({ success: false, error: 'bad_request' });
    if (listCache.d && Date.now() - listCache.t < TTL) return send(res, listCache.d);
    building = building || buildList().finally(() => { building = null; });
    const d = await building;
    if (!d.channels.length && listCache.d) return send(res, listCache.d);
    return send(res, d);
  } catch (e) {
    if (listCache.d) return send(res, listCache.d);
    res.status(502).json({ success: false, error: String((e && e.message) || e) });
  }
};
module.exports._t = { parseM3U, mapGroup, cleanName, normKey, baseKey, hashId, loadAll, buildList };
