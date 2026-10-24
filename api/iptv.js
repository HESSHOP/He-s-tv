// API IPTV pour HE'S TV — source : https://github.com/iptv-org/iptv
//   /iptv?list=1  -> {groups, channels:[{id,name,group,logo}]}
//   /iptv?id=<n>  -> {url:"<m3u8>"}
// Env optionnelles : IPTV_SOURCES (URLs m3u séparées par virgules), IPTV_MAX (défaut 600)
const DEFAULT_SOURCES = [
  'https://iptv-org.github.io/iptv/countries/fr.m3u',
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/categories/movies.m3u',
  'https://iptv-org.github.io/iptv/categories/sports.m3u',
  'https://iptv-org.github.io/iptv/categories/kids.m3u'
];
const FAKE_PAT = /(test|fake|adult|xxx|18\+|erp|promo|advertising|placeholder|offline|dead|demo|iptv|playlist)/i;
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
  const max = +(process.env.IPTV_MAX || 600);

  const plays = await Promise.all(urls.map(async u => {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) return [];
      return parseM3U(await r.text());
    } catch (e) { return []; }
  }));

  const seen = new Set(), all = [];
  plays.flat().forEach(c => {
    const key = (c.name + '|' + c.group).toLowerCase();
    if (seen.has(key) || FAKE_PAT.test(c.name)) return;
    seen.add(key);
    all.push(c);
  });
  all.sort((a, b) => a.name.length - b.name.length);

  const alive = [], groups = new Set();
  for (let i = 0; i < all.length && alive.length < max; i += 30) {
    const batch = all.slice(i, i + 30);
    const ok = await Promise.all(batch.map(c => checkAlive(c.url)));
    batch.forEach((c, k) => {
      if (ok[k] && alive.length < max) {
        alive.push(c);
        const g = (c.group || 'Autres').trim();
        if (!groups.has(g)) groups.add(g);
      }
    });
  }

  const d = { groups: [...groups].sort(), channels: alive.map((c, i) => ({ id: i, name: c.name, group: c.group, logo: c.logo })) };
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
    const r = await fetch(url, { headers: { 'Range': 'bytes=0-255' }, redirect: 'follow', signal: AbortSignal.timeout(6000) });
    return r.ok || r.status === 206 || r.status === 416;
  } catch (e) { return false; }
}
