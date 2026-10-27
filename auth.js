// auth.js — vraie connexion avec Firebase Authentication : e-mail + mot de passe, Google, Facebook
// Chargé par index.html : <script type="module" src="/auth.js"></script> (juste avant </body>)
// « Ma playlist » est chargée en premier et indépendamment de Firebase
import('/perso.js').catch(() => {});

(async () => {
const [{ initializeApp }, {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut,
  signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, FacebookAuthProvider
}] = await Promise.all([
  import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')
]);

const firebaseConfig = {
  apiKey: "AIzaSyCa6zzM9wOSV26mhaUy1t3yLQJcnBL0nJk",
  authDomain: "h-es-tv.firebaseapp.com",
  projectId: "h-es-tv",
  storageBucket: "h-es-tv.firebasestorage.app",
  messagingSenderId: "674488805922",
  appId: "1:674488805922:web:a7d2105706e067ee90b87b"
};
const auth = getAuth(initializeApp(firebaseConfig));
auth.languageCode = 'fr';

// Utilisés par perso.js pour demander la liste « Famille » au serveur
window.getIdToken = async () => (auth.currentUser ? auth.currentUser.getIdToken() : null);
window.authReady = new Promise(res => { let off = null; off = onAuthStateChanged(auth, () => { res(); if (off) off(); }); });

const q = s => document.querySelector(s);

const MSG = {
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail.',
  'auth/weak-password': 'Mot de passe trop faible (8 caractères minimum).',
  'auth/too-many-requests': 'Trop de tentatives, réessayez dans quelques minutes.',
  'auth/network-request-failed': 'Réseau indisponible.',
  'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cet e-mail via une autre méthode (mot de passe, Google ou Facebook).',
  'auth/unauthorized-domain': 'Domaine non autorisé : ajoutez-le dans Firebase > Authentication > Paramètres > Domaines autorisés.',
  'auth/operation-not-allowed': "Cette méthode de connexion n'est pas activée dans Firebase."
};
const msg = e => MSG[e && e.code] || ('Erreur de connexion (' + ((e && e.code) || e) + ')');

// Met à jour l'utilisateur de l'appli (variable globale `user` de index.html)
function setUser(u) {
  const prov = (u.providerData && u.providerData[0] && u.providerData[0].providerId) || '';
  user = {
    name: u.displayName || (u.email || '').split('@')[0] || 'Utilisateur',
    email: u.email || 'Compte ' + (prov === 'facebook.com' ? 'Facebook' : 'HE\'S TV'),
    pic: u.photoURL || '',
    g: prov === 'google.com' ? 1 : 0,
    uid: u.uid,
    verified: !!u.emailVerified
  };
  sv('hu', user);
}

// Session : Firebase conserve la connexion entre les visites
onAuthStateChanged(auth, u => {
  if (u) setUser(u);
  else if (user && user.email) { user = { name: 'Invité' }; sv('hu', null); }
});

// Retour d'une connexion par redirection (repli si la fenêtre Google/Facebook est bloquée)
getRedirectResult(auth).then(r => { if (r && r.user) { setUser(r.user); enter(); } }).catch(e => toast(msg(e)));

let busy = false;
const run = async f => { if (busy) return; busy = true; try { await f(); } finally { busy = false; } };

// --- Connexion e-mail ---
window.login = () => run(async () => {
  const m = q('#em').value.trim().toLowerCase(), p = q('#pw').value;
  const r = [bad('em', !mailOK(m)), bad('pw', p.length < 6)];
  if (r.some(Boolean)) return;
  try { const c = await signInWithEmailAndPassword(auth, m, p); setUser(c.user); enter(); }
  catch (e) { toast(msg(e)); }
});

// --- Inscription e-mail (envoie le mail de vérification) ---
window.reg = () => run(async () => {
  const un = q('#un').value.trim(), m = q('#em2').value.trim().toLowerCase(), p = q('#pw2').value;
  const r = [bad('un', un.length < 3), bad('em2', !mailOK(m)), bad('tel', q('#tel').value.replace(/\D/g, '').length < 8), bad('pw2', p.length < 8)];
  if (r.some(Boolean)) return;
  try {
    const c = await createUserWithEmailAndPassword(auth, m, p);
    await updateProfile(c.user, { displayName: un });
    try { await sendEmailVerification(c.user); } catch (e) {}
    setUser(c.user);
    go('s9');
  } catch (e) { toast(msg(e)); }
});

// --- Mot de passe oublié ---
window.forgot = () => run(async () => {
  const m = q('#em3').value.trim().toLowerCase();
  if (bad('em3', !mailOK(m))) { toast('Saisissez votre adresse e-mail.'); return; }
  try { await sendPasswordResetEmail(auth, m); }
  catch (e) { if (e.code !== 'auth/user-not-found') { toast(msg(e)); return; } }
  toast('Si un compte existe, un lien vient d\'être envoyé ✓');
  setTimeout(() => go('s7'), 1200);
});

// --- Google / Facebook ---
const social = p => run(async () => {
  try { const c = await signInWithPopup(auth, p); setUser(c.user); enter(); }
  catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      try { await signInWithRedirect(auth, p); return; } catch (x) { e = x; }
    }
    toast(msg(e));
  }
});
window.googleLogin = () => { const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); social(p); };
window.facebookLogin = () => { const p = new FacebookAuthProvider(); p.addScope('email'); social(p); };
const fbBtn = q('#s7 .soc button');
if (fbBtn) fbBtn.onclick = window.facebookLogin;

// --- Déconnexion ---
window.logout = () => {
  signOut(auth).catch(() => {});
  user = { name: 'Invité' }; sv('hu', null);
  toast('Déconnecté'); go('s7');
};
})().catch(e => console.error('auth.js', e));
