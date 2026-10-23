// Fonction Vercel : relaie /syrix/* vers l'API Syrix. La clé SYRIX_KEY reste dans les variables d'environnement Vercel.
module.exports = async (req, res) => {
  const key = process.env.SYRIX_KEY;
  if (!key) return res.status(500).json({ success: false, error: { code: 'no_key', message: 'SYRIX_KEY manquante' } });
  const q = { ...req.query }; let p = q.p; delete q.p; p = Array.isArray(p) ? p.join('/') : (p || '');
  if (!/^[a-z0-9_\/.-]*$/i.test(p) || p.includes('..')) return res.status(400).json({ success: false });
  const qs = new URLSearchParams(q).toString();
  try {
    const r = await fetch('https://flix.syrixvision.com/api/developer/v1/' + p + (qs ? '?' + qs : ''), { headers: { 'X-API-Key': key } });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    res.status(r.status).send(await r.text());
  } catch (e) { res.status(502).json({ success: false }); }
};
