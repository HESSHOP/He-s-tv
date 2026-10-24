// API Vavoo pour HE'S TV — configurable via variables d'environnement Vercel :
//   VAVOO_INDEX_URL    (défaut: https://www2.vavoo.to/live2/index?countries=all&output=json)
//   VAVOO_RESOLVE_URL  (défaut: https://vavoo.to/mediahubmx-resolve.json)
//   VAVOO_UA           (défaut: okhttp/4.11.0)
//   VAVOO_GROUPS       (laisser VIDE = tous les pays, inclut France + Gabon + Afrique)
// Endpoints :
//   /vavoo?list=1   -> catalogue {groups, channels:[{id,name,group,logo}]}
//   /vavoo?id=<n>   -> résout la chaîne n -> {url:"/vavoo?u=..."} (m3u8 proxifié)
//   /vavoo?u=<enc>  -> proxy HLS (User-Agent correct + réécriture des segments)
const UA = () => process.env.VAVOO_UA || 'okhttp/4.11.0';
const INDEX_URL = () => process.env.VAVOO_INDEX_URL || 'https://www2.vavoo.to/live2/index?countries=all&output=json';
const RESOLVE_URL = () => process.env.VAVOO_RESOLVE_URL || 'https://vavoo.to/mediahubmx-resolve.json';

const cleanName = s => {
  let n = String(s || '').trim();
  for (const r of [
    /^\[?[A-Z]{2,3}\]?\s*[|•·\-]\s*/i,
    /\s*[|•·]\s*[A-Z]{2,3}\s*$/i,
    /\s*\((?:FR|FRA|France|Gabon|GA|HD|FHD|4K|SD)\)\s*$/i,
    /\s+(?:HD|FHD|UHD|4K|SD|H265|HEVC|Back ?up)$/i,
    /^\d+\s*[.\-]\s*/,
    /[*✳✱]\s*$/
  ]) n = n.replace(r, '');
  return n.trim().replace(/\s+/g, ' ');
};
const normKey = n => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

// Priorité : 0 = francophone (France/Gabon/Afrique), 1 = autres
const FR_PAT = /(france|gabon|afrique|ivoire|senegal|sénégal|cameroun|congo|mali|burkina|benin|bénin|togo|niger|guinee|guinée|tchad|r\.c\.a|rwanda|maroc|algerie|algérie|tunisie|canal\+ ?(o|j)|a\+|novela|antenne ?a|rts ?1|tv\+|tf1|m6\b|france ?[2-5]|gulli|c8|w9|tmc|6ter|bfm|cnews|lci|arte|rmc|nrj|cstar|rire|comedie|action|nickelodeon|cartoon|boomerang|disney|teletoon|piwi|eurosport|bein)/i;
const prio = n => FR_PAT.test(String(n || '')) ? 0 : 1;

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
  // Filtre pays optionnel — laisser VIDE pour tout inclure (Gabon, A+, Action…)
  const filter = (process.env.VAVOO_GROUPS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const seen = new Set(), channels = [], groups = new Set();
  list.forEach(c => {
    if (!c || !c.name || !c.url) return;
    const g = String(c.group || 'Autres').trim();
    if (filter.length && !filter.includes(g.toLowerCase())) return;
    if (seen.has(c.url)) return;
    seen.add(c.url);
    groups.add(g);
    channels.push({ name: cleanName(c.name), group: g, logo: c.logo || '', url: c.url, p: prio(c.name) });
  });
  // Priorité francophone d'abord, puis ordre alphabétique
  channels.sort((a, b) => a.p - b.p || a.name.localeCompare(b.name, 'fr'));
  const d = { groups: [...groups].sort((a, b) => a.localeCompare(b, 'fr')), channels };
  cat = { t: Date.now(), d };
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
