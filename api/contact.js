// Fonction Vercel. La clé RESEND_API_KEY reste dans les variables d'environnement, jamais dans le front-end.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  const b = req.body || {}, c = s => String(s || '').trim();
  const json = (req.headers.accept || '').includes('application/json');
  const done = () => json ? res.status(200).json({ ok: true }) : res.redirect(303, '/merci');
  const fail = (code, m) => json ? res.status(code).json({ ok: false, error: m }) : res.status(code).send(m);
  if (c(b.website)) return done();
  if (b.t && Date.now() - Number(b.t) < 3000) return fail(429, 'Trop rapide.');
  const name = c(b.name).slice(0, 100), email = c(b.email).slice(0, 200), msg = c(b.message).slice(0, 3000);
  const consent = b.consent === 'on' || b.consent === true;
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || msg.length < 10 || !consent) return fail(400, 'Formulaire invalide.');
  const key = process.env.RESEND_API_KEY; if (!key) return fail(500, 'Envoi indisponible.');
  const esc = s => s.replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const r = await fetch('https://api.resend.com/emails', { method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'Prime Purge <onboarding@resend.dev>', to: ['primepurgetech@gmail.com'], reply_to: email,
      subject: 'Message du site : ' + name.replace(/[\r\n]/g, ' '), html: `<p><b>${esc(name)}</b> (${esc(email)})</p><p>${esc(msg).replace(/\n/g, '<br>')}</p>` }) });
  return r.ok ? done() : fail(502, 'Envoi impossible.');
};
