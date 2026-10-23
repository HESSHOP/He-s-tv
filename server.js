// Lancer :  SYRIX_KEY="ta-clé" node server.js   puis ouvrir http://localhost:3000
// (Node 18+). La clé Syrix reste ici, côté serveur, jamais dans le navigateur.
const http = require('http'), fs = require('fs'), path = require('path');
const BASE = 'https://flix.syrixvision.com/api/developer/v1';
const KEY = process.env.SYRIX_KEY;
if (!KEY) console.warn('⚠ SYRIX_KEY manquante : la lecture complète sera désactivée.');

http.createServer(async (req, res) => {
  if (req.url.startsWith('/syrix/')) {
    try {
      const r = await fetch(BASE + req.url.slice(6), { headers: { 'X-API-Key': KEY || '' } });
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      return res.end(await r.text());
    } catch (e) {
      res.writeHead(502); return res.end('{"success":false}');
    }
  }
  fs.readFile(path.join(__dirname, 'index.html'), (e, d) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(d);
  });
}).listen(3000, () => console.log('HE\'S TV → http://localhost:3000'));
