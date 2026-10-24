// API Vavoo pour HE'S TV — configurable via variables d'environnement Vercel :
//   VAVOO_INDEX_URL    (défaut: https://www2.vavoo.to/live2/index?countries=all&output=json)
//   VAVOO_RESOLVE_URL  (défaut: https://vavoo.to/mediahubmx-resolve.json)
//   VAVOO_UA           (défaut: okhttp/4.11.0)
//   VAVOO_GROUPS       (filtre pays, ex: "France,Germany" — vide = tous)
// Endpoints exposés :
//   /vavoo?list=1   -> catalogue {groups, channels:[{id,name,group,logo}]}
//   /vavoo?id=<n>   -> résout la chaîne n -> {url:"/vavoo?u=..."} (m3u8 proxifié)
//   /vavoo?u=<enc>  -> proxy HLS (User-Agent correct + réécriture des segments)
const UA = () => process.env.VAVOO_UA || 'okhttp/4.11.0';
const INDEX_URL = () => process.env.VAVOO_INDEX_URL || 'https://www2.vavoo.to/live2/index?countries=all&output=json';
const RESOLVE_URL = () => process.env.VAVOO_RESOLVE_URL || 'https://vavoo.to/mediahubmx-resolve.json';

let cat = { t: 0, d: null };

module.exports = async (req, res) => {
  const q = req.query;
  try {
    if (q.u !== undefined) return await proxy(req, res, q.u);
    if (q.id !== undefined) return await resolveCh(req, res, q.id);
    if (q.list) return await listCh(req, res);
    res.status(400).json({ success: false, error: 'bad_request' });
  } catch (e) {
    res.status(502).json({ success: false, error: String((e && e.message) || e) });
  }
};

async function getCatalog() {
  if (cat.d && Date.now() - cat.t < 600000) return cat.d; // cache 10 min
  const r = await fetch(INDEX_URL(), {
    headers: { 'User-Agent': UA(), 'Referer': 'https://vavoo.tv' }
  });
  if (!r.ok) throw new Error('index_' + r.status);
  const list = await r.json();
  if (!Array.isArray(list)) throw new Error('index_format');
  const filter = (process.env.VAVOO_GROUPS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const seen = new Set(), channels = [], groups = [];
  list.forEach(c => {
    if (!c || !c.name || !c.url) return;
    const g = String(c.group || 'Autres').trim();
    if (filter.length && !filter.includes(g.toLowerCase())) return;
    if (seen.has(c.url)) return;
    seen.add(c.url);
    if (!groups.includes(g)) groups.push(g);
    channels.push({ name: String(c.name).trim(), group: g, logo: c.logo || '', url: c.url });
  });
  cat = { t: Date.now(), d: { groups: groups.sort(), channels } };
  return cat.d;
}

async function listCh(req, res) {
  const d = await getCatalog();
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ groups: d.groups, channels: d.channels.map((c, i) => ({ id: i, name: c.name, group: c.group, logo: c.logo })) });
}

async function resolveCh(req, res, id) {
  const d = await getCatalog();
  const c = d.channels[+id];
  if (!c) return res.status(404).json({ success: false, error: 'no_channel' });
  let target = c.url;
  try {
    const r = await fetch(RESOLVE_URL(), {
      method: 'POST',
      headers: { 'User-Agent': UA(), 'Content-Type': 'application/json; charset=utf-8', 'Referer': 'https://vavoo.tv' },
      body: JSON.stringify({ language: 'de', region: 'AT', url: c.url, clientVersion: '3.0.2' })
    });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j) && j[0] && j[0].url) target = j[0].url;
    }
  } catch (e) { /* fallback : URL brute via le proxy */ }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ url: '/vavoo?u=' + encodeURIComponent(target) });
}

async function proxy(req, res, enc) {
  const u = decodeURIComponent(enc);
  if (!/^https:\/\//i.test(u)) return res.status(400).json({ success: false });
  const r = await fetch(u, { headers: { 'User-Agent': UA(), 'Referer': 'https://vavoo.tv' } });
  if (!r.ok) return res.status(r.status).json({ success: false, error: 'upstream_' + r.status });
  const ct = r.headers.get('content-type') || '';
  if (/mpegurl|x-mpegurl|text\/plain/i.test(ct) || /\.m3u8($|\?)/i.test(u)) {
    const base = u;
    const text = await r.text();
    const P = '/vavoo?u=';
    const abs = x => { try { return new URL(x, base).toString(); } catch (e) { return x; } };
    const out = text.split(/\r?\n/).map(line => {
      if (!line) return line;
      if (line.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (m, x) => 'URI="' + P + encodeURIComponent(abs(x)) + '"');
      return P + encodeURIComponent(abs(line.trim()));
    }).join('\n');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(out);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  res.setHeader('Content-Type', ct || 'video/mp2t');
  res.setHeader('Cache-Control', 's-maxage=30');
  res.status(200).send(buf);
}
