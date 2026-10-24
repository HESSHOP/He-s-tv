// Fonction Vercel : récupère les chaînes live Vavoo (groupe Bulgarie).
// Le token est obtenu côté serveur, jamais exposé au navigateur.
const UA = 'VAVOO/2.6';
let cache = { t: 0, d: null };

module.exports = async (req, res) => {
  // Cache mémoire chaude 4 min : évite de re-register à chaque appel
  if (cache.d && Date.now() - cache.t < 240000) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(cache.d);
  }
  try {
    const a = await fetch('https://vavoo.to/api/v2/auth/register', {
      method: 'POST',
      headers: { 'User-Agent': UA }
    });
    if (!a.ok) throw new Error('auth_' + a.status);
    const auth = await a.json().catch(() => ({}));
    const token = (auth && auth.token) || '';

    const lr = await fetch('https://vavoo.to/live2/index' + (token ? '?token=' + encodeURIComponent(token) : ''), {
      headers: { 'User-Agent': UA }
    });
    if (!lr.ok) throw new Error('live_' + lr.status);
    const list = await lr.json();

    const out = (Array.isArray(list) ? list : [])
      .filter(c => c && c.group && /bulgaria/i.test(c.group))
      .map(c => Object.assign({}, c, {
        url: token ? c.url + '?token=' + encodeURIComponent(token) : c.url
      }));

    cache = { t: Date.now(), d: JSON.stringify(out) };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(cache.d);
  } catch (e) {
    res.status(502).json({ success: false, error: 'vavoo_upstream' });
  }
};