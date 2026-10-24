/* HE'S TV – /api/duo : relais Duo (télé crée un code à 6 chiffres, le téléphone envoie des commandes).
   Stockage : Redis REST (Upstash). Variables lues : UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
   ou KV_REST_API_URL / KV_REST_API_TOKEN (créées par l'intégration Redis/KV de Vercel). */
const crypto = require('crypto');
const U = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const K = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const CMDS = ['up', 'down', 'left', 'right', 'ok', 'back', 'home', 'chp', 'chn', 'prog'];
const TTL = 7200;

const R = async (cmds) => {
  const r = await fetch(U.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('store');
  return (await r.json()).map((x) => x.result);
};
const limited = async (ip, name, max) => {
  const k = 'duo:rl:' + name + ':' + ip;
  const [c] = await R([['INCR', k], ['EXPIRE', k, 60, 'NX']]);
  return c > max;
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  if (!U || !K) return res.status(503).json({ ok: false, error: 'no_store' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (e) { b = {}; }
  b = b || {};
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const code = String(b.code || '');
  const key = 'duo:' + code;
  try {
    if (b.a === 'create') {
      if (await limited(ip, 'c', 20)) return res.status(429).json({ ok: false, error: 'rate' });
      for (let i = 0; i < 6; i++) {
        const c = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        const [ok] = await R([['SET', 'duo:' + c, '1', 'EX', TTL, 'NX']]);
        if (ok === 'OK') return res.status(200).json({ ok: true, code: c });
      }
      return res.status(503).json({ ok: false, error: 'busy' });
    }
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ ok: false, error: 'code' });

    if (b.a === 'join') {
      if (await limited(ip, 'j', 10)) return res.status(429).json({ ok: false, error: 'rate' });
      const [e] = await R([['EXISTS', key]]);
      if (!e) return res.status(404).json({ ok: false, error: 'unknown' });
      await R([['SET', key + ':j', '1', 'EX', TTL]]);
      return res.status(200).json({ ok: true });
    }
    if (b.a === 'send') {
      if (!CMDS.includes(b.cmd)) return res.status(400).json({ ok: false, error: 'cmd' });
      if (await limited(ip, 's', 180)) return res.status(429).json({ ok: false, error: 'rate' });
      const [e] = await R([['EXISTS', key]]);
      if (!e) return res.status(404).json({ ok: false, error: 'unknown' });
      await R([['RPUSH', key + ':q', b.cmd], ['LTRIM', key + ':q', -30, -1], ['EXPIRE', key + ':q', 60]]);
      return res.status(200).json({ ok: true });
    }
    if (b.a === 'poll') {
      const [alive, cmds, joined] = await R([['EXPIRE', key, TTL], ['LPOP', key + ':q', 30], ['EXISTS', key + ':j']]);
      if (!alive) return res.status(404).json({ ok: false, error: 'unknown' });
      return res.status(200).json({ ok: true, cmds: cmds || [], joined: !!joined });
    }
    return res.status(400).json({ ok: false, error: 'action' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server' });
  }
};
