// API IPTV pour HE'S TV — source : https://github.com/iptv-org/iptv
//   /iptv?list=1  -> {groups, channels:[{id,name,group,logo}]}
//   /iptv?id=<n>  -> {url:"<m3u8>"}
// Env optionnelles : IPTV_SOURCES (URLs m3u séparées par virgules), IPTV_MAX (défaut 900)

const DEFAULT_SOURCES = [
  'https://iptv-org.github.io/iptv/countries/fr.m3u',
  'https://iptv-org.github.io/iptv/countries/ga.m3u',          // Gabon
  'https://iptv-org.github.io/iptv/regions/wafr.m3u',          // Afrique de l'Ouest (Gabon, CI, SN, CM…)
  'https://iptv-org.github.io/iptv/languages/fra.m3u',
  'https://iptv-org.github.io/iptv/categories/animation.m3u',  // animés
  'https://iptv-org.github.io/iptv/categories/comedy.m3u',     // rire & comédie
  'https://iptv-org.github.io/iptv/categories/series.m3u',     // séries & novelas
  'https://iptv-org.github.io/iptv/categories/movies.m3u',
  'https://iptv-org.github.io/iptv/categories/sports.m3u',
  'https://iptv-org.github.io/iptv/categories/kids.m3u',
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/categories/documentary.m3u',
  'https://iptv-org.github.io/iptv/categories/music.m3u',
  'https://iptv-org.github.io/iptv/categories/entertainment.m3u'
];

const FAKE_PAT = /(test|fake|adult|xxx|18\+|erp|promo|advertising|placeholder|offline|dead|demo|iptv|playlist|radio)/i;

// Normalisation des noms : "TF1 ․ FR", "FR| TF1", "[4K] TF1", "TF1 HD" -> "TF1"
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

// Mapping des groupes iptv-org -> catégories FR
const GROUP_MAP = {
  news: 'Info', 'news & politics': 'Info', politics: 'Info', weather: 'Info',
  movies: 'Cinéma', 'movies & series': 'Cinéma',
  series: 'Novelas & Séries',
  animation: 'Animés', anime: 'Animés',
  sports: 'Sport', sport: 'Sport', outdoor: 'Sport', fight: 'Sport',
  kids: 'Jeunesse', family: 'Jeunesse', 'child': 'Jeunesse', children: 'Jeunesse',
  documentary: 'Documentaires', 'science & nature': 'Documentaires', history: 'Documentaires', education: 'Documentaires',
  music: 'Musique',
  comedy: 'Rire & Comédie',
  entertainment: 'Divertissement', lifestyle: 'Divertissement', talk: 'Divertissement', travel: 'Divertissement',
  general: 'Généralistes', 'general & entertainment': 'Généralistes', culture: 'Culture', religious: 'Culture',
  cooking: 'Cuisine', food: 'Cuisine', auto: 'Auto', 'auto & vehicle': 'Auto',
  business: 'Éco', shop: 'Shopping'
};
const mapGroup = g => GROUP_MAP[String(g || '').trim().toLowerCase()] || 'Autres';

// Fallback logos pour les chaînes majeures (si tvg-logo absent)
const LOGOS = {
  'TF1': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/TF1_logo_2013.png',
  'France 2': 'https://upload.wikimedia.org/wikipedia/commons/f/fd/France_2_2018.svg',
  'France 3': 'https://upload.wikimedia.org/wikipedia/commons/6/6e/France_3_2018.svg',
  'France 4': 'https://upload.wikimedia.org/wikipedia/commons/9/9e/France_4_2018.svg',
  'France 5': 'https://upload.wikimedia.org/wikipedia/commons/1/1d/France_5_2018.svg',
  'M6': 'https://upload.wikimedia.org/wikipedia/commons/7/74/M6_logo_2025.svg',
  'W9': 'https://upload.wikimedia.org/wikipedia/commons/9/9a/W9_2020.svg',
  'TMC': 'https://upload.wikimedia.org/wikipedia/commons/1/1f/TMC_2016.svg',
  'TFX': 'https://upload.wikimedia.org/wikipedia/commons/0/04/TFX_logo_2018.svg',
  '6ter': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/6ter_logo_2018.svg',
  'Arte': 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Arte_2011.svg',
  'BFM TV': 'https://upload.wikimedia.org/wikipedia/commons/2/22/BFM_TV_2023.svg',
  'CNEWS': 'https://upload.wikimedia.org/wikipedia/commons/e/e9/CNEWS_2023.svg',
  'LCI': 'https://upload.wikimedia.org/wikipedia/commons/6/61/LCI_logo_2018.svg',
  'France 24': 'https://upload.wikimedia.org/wikipedia/commons/5/5b/France_24_logo.svg',
  'C8': 'https://upload.wikimedia.org/wikipedia/commons/6/62/C8_logo_2024.svg',
  'CStar': 'https://upload.wikimedia.org/wikipedia/commons/f/f7/CSTAR_2024.svg',
  'Gulli': 'https://upload.wikimedia.org/wikipedia/commons/5/50/Gulli_2023.svg',
  // Animés / jeunesse
  'Cartoon Network': 'https://upload.wikimedia.org/wikipedia/commons/8/80/Cartoon_Network_2010_logo.svg',
  'Boomerang': 'https://upload.wikimedia.org/wikipedia/commons/1/10/Boomerang_2015.svg',
  'Nickelodeon': 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Nickelodeon_2023.svg',
  'Disney Channel': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Disney_Channel_2022.svg',
  'Game One': 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Game_One_2018.svg',
  // Séries / novelas / comédie / action
  'Novelas TV': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Novela_TV_2016.svg',
  'Novela Channel': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Novela_TV_2016.svg',
  'Comedy Central': 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Comedy_Central_2019.svg',
  'Action': 'https://upload.wikimedia.org/wikipedia/commons/2/28/Action_logo_2019.svg',
  // A+ (Canal+ Afrique)
  'A+ Ivoire': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/A%2B_logo_2019.svg',
  'A+ Afrique': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/A%2B_logo_2019.svg',
  'A+ Sénégal': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/A%2B_logo_2019.svg',
  'A+ Congo': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/A%2B_logo_2019.svg',
  'A+ Cameroun': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/A%2B_logo_2019.svg',
  // Sport / doc / musique
  'Eurosport': 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Eurosport_2021.svg',
  'Discovery': 'https://upload.wikimedia.org/wikipedia/commons/9/92/Discovery_Channel_logo_2020.svg',
  'National Geographic': 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Natgeologo.svg',
  'MTV': 'https://upload.wikimedia.org/wikipedia/commons/e/e6/MTV_2021.svg',
  'TV5 Monde': 'https://upload.wikimedia.org/wikipedia/commons/e/e5/TV5MONDE_2016.svg',
  // Gabon
  'Gabon 24': 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Gabon_24.svg'
};
const fallbackLogo = name => {
  const key = normKey(name);
  for (const [k, v] of Object.entries(LOGOS)) if (v && normKey(k) === key) return v;
  for (const [k, v] of Object.entries(LOGOS)) {
    const nk = normKey(k);
    if (v && nk.length >= 4 && key.startsWith(nk)) return v;
  }
  return '';
};

let cache = { t: 0, d: null, raw: [] };
const TTL = 6 * 3600 * 1000;

module.exports = async (req, res) => {
  const q = req.query;
  try {
    if (q.id !== undefined) {
      const d = cache.d && Date.now() - cache.t < TTL ? cache : await refresh();
      const c = d.raw[+q.id];
      return c ? res.status(200).json({ url: c.url }) : res.status(404).json({ success: false });
    }
    if (!q.list) return res.status(400).json({ success: false, error: 'bad_request' });
    if (cache.d && Date.now() - cache.t < TTL) return send(res, cache.d);
    const d = await refresh();
    if (!d.channels.length && cache.d) return send(res, cache.d);
    return send(res, d);
  } catch (e) {
    if (cache.d) return send(res, cache.d);
    res.status(502).json({ success: false, error: String((e && e.message) || e) });
  }
};

function send(res, d) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(d);
}

async function refresh() {
  const sources = (process.env.IPTV_SOURCES || '').split(',').map(s => s.trim()).filter(Boolean);
  const urls = sources.length ? sources : DEFAULT_SOURCES;
  const max = +(process.env.IPTV_MAX || 900);

  const plays = await Promise.all(urls.map(async u => {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) return [];
      return parseM3U(await r.text());
    } catch (e) { return []; }
  }));

  // Dédoublonnage sur le nom normalisé (pas le groupe), avec complétion du logo
  const seen = new Map(), all = [];
  plays.flat().forEach(c => {
    c.name = cleanName(c.name);
    c.group = mapGroup(c.group);
    if (!c.name || FAKE_PAT.test(c.name)) return;
    const key = normKey(c.name);
    if (seen.has(key)) {
      const prev = seen.get(key);
      if (prev && !prev.logo && c.logo) { prev.logo = c.logo; return; }
      return;
    }
    if (!c.logo) c.logo = fallbackLogo(c.name);
    seen.set(key, c);
    all.push(c);
  });

  all.sort((a, b) => a.group.localeCompare(b.group, 'fr') || a.name.localeCompare(b.name, 'fr'));

  const alive = [], groups = new Set();
  for (let i = 0; i < all.length && alive.length < max; i += 30) {
    const batch = all.slice(i, i + 30);
    const ok = await Promise.all(batch.map(c => checkAlive(c.url)));
    batch.forEach((c, k) => {
      if (ok[k] && alive.length < max) {
        alive.push(c);
        groups.add(c.group);
      }
    });
  }

  const d = { groups: [...groups].sort((a, b) => a.localeCompare(b, 'fr')), channels: alive.map((c, i) => ({ id: i, name: c.name, group: c.group, logo: c.logo })) };
  cache = { t: Date.now(), d, raw: alive };
  return d;
}

function parseM3U(text) {
  const out = [];
  let cur = null;
  text.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (line.startsWith('#EXTINF')) {
      cur = {
        name: (line.split(',').pop() || '').trim(),
        logo: (line.match(/tvg-logo="([^"]*)"/) || [])[1] || '',
        group: (line.match(/group-title="([^"]*)"/) || [])[1] || 'Autres'
      };
    } else if (line && !line.startsWith('#') && cur) {
      if (/^https:\/\//i.test(line) && cur.name) out.push({ ...cur, url: line });
      cur = null;
    }
  });
  return out;
}

async function checkAlive(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(6000) });
    if (r.ok || r.status === 206 || r.status === 416 || r.status === 403 || r.status === 453) return true;
    if (r.status === 404 || r.status === 410) return false;
    const r2 = await fetch(url, { headers: { 'Range': 'bytes=0-255' }, redirect: 'follow', signal: AbortSignal.timeout(6000) });
    return r2.status < 500;
  } catch (e) { return false; }
}
