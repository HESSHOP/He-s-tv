/* HE'S TV – /api/duo : relais Duo.
   Un appareil « hôte » (télé qui reçoit les commandes) crée SON code à 6 chiffres + un secret que lui seul connaît.
   N'importe quel appareil « contrôleur » (téléphone ou autre télé) entre le code et envoie des commandes.
   Le propriétaire peut RÉVOQUER son code à tout moment (les contrôleurs sont alors déconnectés).
   Stockage : Redis REST (Upstash). Variables lues : UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
   ou KV_REST_API_URL / KV_REST_API_TOKEN, ou toute variable finissant par REST_API_URL / REST_API_TOKEN
   (ex. STORAGE_REST_API_URL créée par l'intégration Vercel avec un préfixe personnalisé).
   Clés : duo:<code> = secret · duo:q:<secret> = file de commandes · duo:j:<secret> = un contrôleur est connecté */
const crypto = require('crypto');
const find = (re) => { const k = Object.keys(process.env).find((n) => re.test(n)); return k ? process.env[k] : undefined; };
const U = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || find(/REST_(API_)?URL$/);
const K = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || find(/REST_(API_)?TOKEN$/);
const CMDS = ['up', 'down', 'left', 'right', 'ok', 'back', 'home', 'chp', 'chn', 'prog'];
const TTL = 30 * 24 * 3600; // le code personnel reste valable 30 jours, renouvelé à chaque utilisation

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
const out = (res, code, o) => res.status(code).json(o);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return out(res, 405, { ok: false, error: 'method' });
  if (!U || !K) return out(res, 503, { ok: false, error: 'no_store' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (e) { b = {}; }
  b = b || {};
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const code = String(b.code || '');
  const key = 'duo:' + code;
  const secret = String(b.secret || '');
  try {
    if (b.a === 'create') {
      if (await limited(ip, 'c', 20)) return out(res, 429, { ok: false, error: 'rate' });
      for (let i = 0; i < 6; i++) {
        const c = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        const s = crypto.randomBytes(16).toString('hex');
        const [ok] = await R([['SET', 'duo:' + c, s, 'EX', TTL, 'NX']]);
        if (ok === 'OK') return out(res, 200, { ok: true, code: c, secret: s });
      }
      return out(res, 503, { ok: false, error: 'busy' });
    }
    if (!/^\d{6}$/.test(code)) return out(res, 400, { ok: false, error: 'code' });

    // Contrôleur : rejoindre un code
    if (b.a === 'join') {
      if (await limited(ip, 'j', 10)) return out(res, 429, { ok: false, error: 'rate' });
      const [s] = await R([['GET', key]]);
      if (!s) return out(res, 404, { ok: false, error: 'unknown' });
      await R([['SET', 'duo:j:' + s, '1', 'EX', TTL]]);
      return out(res, 200, { ok: true });
    }
    // Contrôleur : envoyer une commande
    if (b.a === 'send') {
      if (!CMDS.includes(b.cmd)) return out(res, 400, { ok: false, error: 'cmd' });
      if (await limited(ip, 's', 180)) return out(res, 429, { ok: false, error: 'rate' });
      const [s] = await R([['GET', key]]);
      if (!s) return out(res, 404, { ok: false, error: 'unknown' });
      await R([['RPUSH', 'duo:q:' + s, b.cmd], ['LTRIM', 'duo:q:' + s, -30, -1], ['EXPIRE', 'duo:q:' + s, 60]]);
      return out(res, 200, { ok: true });
    }
    // Hôte : récupérer les commandes (le secret est requis ; la file est nommée d'après le secret,
    // un faux secret ne vide donc jamais la file de quelqu'un d'autre). k=1 : renouveler la durée de vie.
    if (b.a === 'poll') {
      if (!/^[a-f0-9]{32}$/.test(secret)) return out(res, 403, { ok: false, error: 'secret' });
      const cmds = [['GET', key], ['LPOP', 'duo:q:' + secret, 30], ['EXISTS', 'duo:j:' + secret]];
      if (b.k) cmds.push(['EXPIRE', key, TTL], ['EXPIRE', 'duo:j:' + secret, TTL]);
      const [cur, q, joined] = await R(cmds);
      if (!cur) return out(res, 404, { ok: false, error: 'unknown' });
      if (cur !== secret) return out(res, 403, { ok: false, error: 'secret' });
      return out(res, 200, { ok: true, cmds: q || [], joined: !!joined });
    }
    // Hôte : révoquer son code (déconnecte tous les contrôleurs)
    if (b.a === 'revoke') {
      if (!/^[a-f0-9]{32}$/.test(secret)) return out(res, 403, { ok: false, error: 'secret' });
      const [cur] = await R([['GET', key]]);
      if (!cur) return out(res, 200, { ok: true });
      if (cur !== secret) return out(res, 403, { ok: false, error: 'secret' });
      await R([['DEL', key], ['DEL', 'duo:q:' + secret], ['DEL', 'duo:j:' + secret]]);
      return out(res, 200, { ok: true });
    }
    return out(res, 400, { ok: false, error: 'action' });
  } catch (e) {
    return out(res, 500, { ok: false, error: 'server' });
  }
};
