// /api/famille.js — playlists de la famille, protégées par un CODE FAMILLE (pas de comptes ni d'e-mails).
// Les fichiers .m3u / .m3u8 / .txt placés dans le dossier api/_playlists/ du dépôt sont lus ICI, côté serveur.
// Ils ne sont JAMAIS servis publiquement : la liste n'est renvoyée qu'à qui présente le bon code
// (variable d'environnement FAMILY_CODE, 8 caractères minimum), saisi une fois par appareil dans l'appli.
//   GET /api/famille  (en-tête  x-famille-code: <code>)  ->  { channels:[{name,group,logo,url}], skipped:{...} }
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '_playlists');
const PAGES = /(^|\.)(youtube\.com|youtu\.be|twitch\.tv|dailymotion\.com|facebook\.com)$/i;

/* --- vérification du code famille (comparaison à temps constant) + limitation des essais --- */
const sha = x => crypto.createHash('sha256').update(String(x)).digest();
const okCode = given => { const c = String(process.env.FAMILY_CODE || ''); return c.length >= 8 && crypto.timingSafeEqual(sha(given), sha(c)); };
const fails = new Map();   // ip -> { n, t } : 10 mauvais essais max par tranche de 10 minutes
const limited = ip => { const f = fails.get(ip); return !!f && Date.now() - f.t < 6e5 && f.n >= 10; };
const fail = ip => { const f = fails.get(ip); if (!f || Date.now() - f.t >= 6e5) fails.set(ip, { n: 1, t: Date.now() }); else f.n++; };

/* --- lecture des playlists M3U --- */
function parse(text, out, seen, sk) {
  let cur = null;
  String(text).split(/\r?\n/).forEach(l => {
    l = l.trim();
    if (l.startsWith('#EXTINF')) {
      const rest = l.replace(/="[^"]*"/g, '=""');
      cur = {
        name: rest.slice(rest.lastIndexOf(',') + 1).replace(/[\u24B6-\u24E9]/g, '').trim(),
        group: (l.match(/group-title="([^"]*)"/) || [])[1] || '',
        logo: (l.match(/tvg-logo="([^"]*)"/) || [])[1] || ''
      };
    } else if (cur && /^#EXTVLCOPT:http-(referrer|referer)=/i.test(l)) {
      cur.ref = 1;
    } else if (l && l[0] !== '#' && cur) {
      if (/^https:\/\//i.test(l)) {
        let host = ''; try { host = new URL(l).hostname; } catch (e) {}
        if (cur.ref) sk.ref++;
        else if (PAGES.test(host)) sk.page++;
        else if (cur.name && !seen.has(l)) {
          seen.add(l);
          out.push({ name: cur.name, group: cur.group, logo: /^https:\/\//i.test(cur.logo) ? cur.logo : '', url: l });
        }
      } else sk.http++;   // http:// : bloqué par le navigateur sur un site https
      cur = null;
    }
  });
}
let cache = null;
function load() {
  if (cache) return cache;
  const out = [], seen = new Set(), sk = { http: 0, page: 0, ref: 0 };
  let files = [];
  try { files = fs.readdirSync(DIR).filter(f => /\.(m3u8?|txt)$/i.test(f)).sort(); } catch (e) {}
  files.forEach(f => { try { parse(fs.readFileSync(path.join(DIR, f), 'utf8'), out, seen, sk); } catch (e) {} });
  cache = { channels: out, skipped: sk, files: files.length };
  return cache;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' });
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ ok: false, error: 'too_many' });
  let code = '';
  try { code = decodeURIComponent(String(req.headers['x-famille-code'] || '')); } catch (e) {}
  if (!code || !okCode(code)) { fail(ip); return res.status(403).json({ ok: false, error: 'forbidden' }); }
  try {
    const d = load();
    return res.status(200).json({ ok: true, channels: d.channels, skipped: d.skipped, files: d.files });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'server' });
  }
};
module.exports._t = { parse };
