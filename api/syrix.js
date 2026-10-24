// Fonction Vercel : relaie /syrix/* vers l'API Syrix. La clé SYRIX_KEY reste dans les variables d'environnement Vercel.
const BASE = 'https://flix.syrixvision.com/api/developer/v1/';
const wait = ms => new Promise(r => setTimeout(r, ms));

module.exports = async (req, res) => {
  const key = process.env.SYRIX_KEY;
  if (!key) return res.status(500).json({ success: false, error: { code: 'no_key', message: 'SYRIX_KEY manquante' } });
  const q = { ...req.query }; let p = q.p; delete q.p; p = Array.isArray(p) ? p.join('/') : (p || '');
  if (!/^[a-z0-9_\/.-]*$/i.test(p) || p.includes('..')) return res.status(400).json({ success: false });
  const qs = new URLSearchParams(q).toString();
  const url = BASE + p + (qs ? '?' + qs : '');
  try {
    let r, body;
    // Syrix limite à 120 requêtes/min et sa source peut limiter aussi (429 / 503) : on réessaie 2 fois
    for (let i = 0; i < 3; i++) {
      r = await fetch(url, { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(15000) });
      body = await r.text();
      if (r.status !== 429 && r.status !== 503) break;
      await wait(700 * (i + 1));
    }
    // On ne met en cache que les réponses réussies (une erreur ne doit pas rester 5 min sur le CDN)
    res.setHeader('Cache-Control', r.ok ? 's-maxage=300, stale-while-revalidate=600' : 'no-store');
    res.setHeader('Content-Type', 'application/json');
    res.status(r.status).send(body);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ success: false, error: { code: 'source_unavailable', message: 'Syrix injoignable' } });
  }
};
