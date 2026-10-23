// Lancer :  SYRIX_KEY="ta-clé" node server.js   puis ouvrir http://localhost:3000   (Node 18+)
// Sert le site complet (accueil, /tv, pages légales) et relaie /syrix/* sans exposer la clé au navigateur.
const http = require('http'), fs = require('fs'), path = require('path');
const BASE = 'https://flix.syrixvision.com/api/developer/v1';
const KEY = process.env.SYRIX_KEY;
if (!KEY) console.warn('⚠ SYRIX_KEY manquante : la lecture complète sera désactivée.');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml' };

http.createServer(async (req, res) => {
  if (req.url.startsWith('/syrix/')) {
    try {
      const r = await fetch(BASE + req.url.slice(6), { headers: { 'X-API-Key': KEY || '' } });
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      return res.end(await r.text());
    } catch (e) { res.writeHead(502); return res.end('{"success":false}'); }
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let f = path.join(__dirname, path.normalize(p));
  if (!f.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, d) => {
    if (e) return fs.readFile(path.join(__dirname, '404.html'), (_, n) => { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); res.end(n); });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d);
  });
}).listen(3000, () => console.log('Prime Purge + HE\'S TV → http://localhost:3000'));
