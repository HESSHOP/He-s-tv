/* HE'S TV – Mode TV automatique + Duo (télécommande téléphone ↔ télé).
   Chargé APRÈS le script principal : <script src="/duo-tv.js"></script> juste avant </body>. */
(()=>{'use strict';
const $=s=>document.querySelector(s),Q=(s,r=document)=>[...r.querySelectorAll(s)];
const ls={g:k=>{try{return localStorage.getItem(k)}catch(e){return null}},s:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};

/* ===== 1. Détection : télé -> mode TV, téléphone -> mobile. ?tv=1 force la TV, ?tv=0 le mobile, ?tv=auto remet l'automatique ===== */
const IS=(()=>{const f=new URLSearchParams(location.search).get('tv');
 if(f==='1')ls.s('htv','1');else if(f==='0')ls.s('htv','0');else if(f==='auto')ls.s('htv',null);
 const m=ls.g('htv');if(m==='1')return true;if(m==='0')return false;
 const ua=navigator.userAgent;
 if(/SMART-?TV|SmartTV|Tizen|Web0S|WebOS|NetCast|HbbTV|BRAVIA|VIDAA|Hisense|\bAFT[A-Z]+\b|CrKey|GoogleTV|Android ?TV|AppleTV|Roku|Viera|\bTV\b|Large ?Screen/i.test(ua))return true;
 /* Box Android (ex. Dreamlink) : Android, pas « Mobile », pas d'écran tactile */
 return /Android/i.test(ua)&&!/Mobile/i.test(ua)&&!(navigator.maxTouchPoints>0)})();
window.IS_TV=IS;document.body.classList.toggle('tv',IS);document.body.classList.toggle('tvmode',IS);
const tvk=()=>document.documentElement.style.setProperty('--tk',Math.max(.5,innerHeight/540));
if(IS){tvk();addEventListener('resize',tvk)}

/* ===== 2. Styles (mode TV + Duo) ===== */
const css=document.createElement('style');css.textContent=`
body.tv{display:block;overflow:hidden;background:#000}
body.tv #app{position:absolute;left:0;top:0;width:calc(100vw / var(--tk,1));height:calc(100vh / var(--tk,1));max-width:none;max-height:none;border:0;border-radius:0;box-shadow:none;transform:scale(var(--tk,1));transform-origin:0 0}
body.tv #hlpb{display:none}
body.tv .tb{left:0;top:0;bottom:0;right:auto;width:92px;height:auto;flex-direction:column;justify-content:center;gap:26px;border-top:0;border-right:1px solid var(--line)}
body.tv .tb button{font-size:11px}body.tv .tb svg{width:26px;height:26px}
body.tv .scr.main{padding:0 20px 20px 112px}
body.tv .scr:not(.main) .form,body.tv .scr:not(.main)>.btn,body.tv .scr:not(.main)>p{max-width:520px}
body.tv #s6>div:last-child{max-width:520px;margin:0 auto}
body.tv .hero{aspect-ratio:auto;height:250px}
body.tv .rowx .pc,body.tv .rowx .sk{height:200px}
body.tv .grid{grid-template-columns:repeat(6,1fr)}
body.tv #nl{display:grid;grid-template-columns:repeat(3,1fr);column-gap:14px}body.tv #nl .wide{margin:0 0 16px}
body.tv #s18{flex-direction:row;align-items:flex-start;justify-content:flex-start;gap:16px}
body.tv #s18>#stk{width:57%;position:sticky;top:0}body.tv #rcol{flex:1;min-width:0}
body.tv .pw.fs .pi>:not(.stg):not(.wmk){zoom:var(--tk,1)}
.tvf{outline:3px solid #fff!important;outline-offset:3px;box-shadow:0 0 0 7px color-mix(in srgb,var(--red) 75%,transparent),0 12px 30px #000!important;scale:1.05;position:relative;z-index:4;border-radius:10px}
.tb .tvf,.cn.tvf,.rb.tvf,.stb.tvf{border-radius:14px}
.pi>.pg{top:46px;bottom:auto;background:none;padding:4px 14px;z-index:9}
.pi>.pbtn{bottom:150px;right:14px;z-index:9}
.pw.hid>.pi>.pbtn,.pw.hid>.pi>.pg{opacity:0;pointer-events:none}
.pi>.pp{z-index:20}
#duo{position:absolute;inset:0;z-index:66;background:var(--bg);display:none;flex-direction:column;align-items:center;padding:56px 22px 24px;overflow-y:auto;text-align:center}
#duo.on{display:flex}#duo h2{margin:0 0 8px;font-size:22px}#duo p{max-width:300px;margin:6px auto}
#duo .x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:0;background:var(--card);color:var(--txt);font-size:16px;cursor:pointer}
#duob{width:100%;display:flex;flex-direction:column;align-items:center}
.qrb{background:#fff;padding:8px;border-radius:12px;margin:12px 0;line-height:0}.qrb img{width:190px;height:190px;image-rendering:pixelated}
.dcode{font-size:42px;font-weight:800;letter-spacing:6px;margin:10px 0 4px;font-variant-numeric:tabular-nums}
.dst{font-size:13px;color:var(--mut)}.dst.ok{color:#1db954}.dst.er{color:#ff5252}
.dpad{display:grid;grid-template-columns:repeat(3,74px);grid-template-rows:repeat(3,74px);gap:10px;margin:16px 0}
.dpad button,.dk button{border:0;border-radius:18px;background:var(--card);color:var(--txt);font-size:26px;cursor:pointer}
.dpad button:active,.dk button:active{transform:scale(.94);background:var(--red)}
.dpad .ok{background:var(--red);color:#fff;font-size:16px;font-weight:700}
.dk{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:320px}.dk button{height:50px;font-size:14px;border-radius:12px}
.dcin{width:100%;max-width:260px;background:var(--card);border:1px solid var(--line);border-radius:10px;color:var(--txt);font:inherit;font-size:28px;letter-spacing:8px;text-align:center;padding:12px;outline:0;margin:14px 0 4px}
.dcin:focus{border-color:var(--red)}
.dtabs{display:flex;gap:8px;margin:4px 0 14px}.dtabs button{border:1px solid var(--line);background:var(--card);color:var(--txt);border-radius:10px;padding:10px 14px;font:inherit;font-size:13px;cursor:pointer}.dtabs .a{background:var(--red);border-color:var(--red);color:#fff}
#dbody{width:100%;display:flex;flex-direction:column;align-items:center}
.dnum{display:grid;grid-template-columns:repeat(3,66px);gap:8px;margin:10px 0}.dnum button{height:52px;border:0;border-radius:12px;background:var(--card);color:var(--txt);font-size:20px;font-weight:600;cursor:pointer}
.dact{display:flex;flex-direction:column;gap:8px;width:100%;max-width:300px;margin-top:10px}.dact .btn{margin:0}
`;document.head.appendChild(css);

/* ===== 3. Navigation télécommande (flèches, OK, retour) ===== */
let cu=null;
const reset=()=>{if(cu)cu.classList.remove('tvf');cu=null};
const SEL='button:not([disabled]),[onclick],input:not([type=hidden]),select,textarea,a[href]';
const open=id=>{const e=document.getElementById(id);return e&&e.classList.contains('on')?e:null};
const isBig=p=>p&&(p.classList.contains('fs')||p.classList.contains('fsx'));
function items(){const p=P(),m=open('ppnl')||open('duo');let r;
 if(m)r=[m];else if(isBig(p))r=[p];else if(open('hp'))r=[$('#hp')];else if($('#pl').style.display==='flex')r=[$('#pl')];
 else{r=[$('.scr.on')];const t=$('#tb');if(t&&t.style.display!=='none')r.push(t)}
 const o=[];r.forEach(x=>x&&Q(SEL,x).forEach(e=>{const b=e.getBoundingClientRect();if(b.width<8||b.height<8||b.bottom<0||b.top>innerHeight*3)return;const c=getComputedStyle(e);if(c.visibility==='hidden'||c.pointerEvents==='none')return;o.push(e)}));return o}
function setF(e){if(cu)cu.classList.remove('tvf');cu=e;if(!e)return;e.classList.add('tvf');try{e.scrollIntoView({block:'center',inline:'center'})}catch(x){}}
function mv(dx,dy){const l=items();if(!l.length)return;
 if(!cu||!l.includes(cu)){const v=l.filter(e=>{const b=e.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth});
  setF((v.length?v:l).slice().sort((a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return(x.top-y.top)||(x.left-y.left)})[0]);return}
 const a=cu.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;let best=null,bs=1e12;
 for(const e of l){if(e===cu||e.contains(cu))continue;const b=e.getBoundingClientRect(),vx=b.left+b.width/2-ax,vy=b.top+b.height/2-ay;
  if(dx&&vx*dx<=2)continue;if(dy&&vy*dy<=2)continue;
  const s=(dx?Math.abs(vx):Math.abs(vy))+(dx?Math.abs(vy):Math.abs(vx))*2.4;if(s<bs){bs=s;best=e}}
 if(best)setF(best)}
function okk(){if(!cu||!document.contains(cu)){mv(0,0);return}
 const t=cu.tagName;if((t==='INPUT'&&cu.type!=='checkbox')||t==='TEXTAREA'){cu.focus();return}cu.click()}
const BK={s19:'s12',s17:'s12',s12:'s18',s8:'s7',s7:'s6',s10:'s7',s9:'s8'};
function back(){if(open('ppnl')){closePP();return 1}if(open('duo')){duoClose();return 1}
 if(isBig(P())){fsT();return 1}if(open('hp')){closeHp();return 1}
 if($('#pl').style.display==='flex'){closePl();return 1}if(BK[cur]){go(BK[cur]);return 1}return 0}
if(IS)document.addEventListener('keydown',e=>{
 const k=e.key,kc=e.keyCode,tg=(e.target&&e.target.tagName)||'';
 const up=k==='ArrowUp',dn=k==='ArrowDown',lf=k==='ArrowLeft',rt=k==='ArrowRight',ok=k==='Enter'||k===' '||kc===13;
 if(/INPUT|TEXTAREA|SELECT/.test(tg)){if(!(ok||k==='Escape'||up||dn))return;if(tg!=='SELECT'||k==='Escape')e.target.blur();if(!up&&!dn)return}
 const isBack=k==='Escape'||k==='GoBack'||k==='BrowserBack'||k==='XF86Back'||kc===10009||kc===461||kc===4||(k==='Backspace'&&!/INPUT|TEXTAREA/.test(tg));
 const p=P(),big=!(open('ppnl')||open('duo'))&&isBig(p),H=()=>{e.preventDefault();e.stopImmediatePropagation()};
 if(isBack){if(back())H();return}
 if(big){const hid=p.classList.contains('hid');
  if(k==='ChannelUp'||kc===427){H();chStep(-1);return}
  if(k==='ChannelDown'||kc===428){H();chStep(1);return}
  if(up||dn){H();chStep(up?-1:1);return}
  if(lf||rt){H();showCc();if(!hid)mv(lf?-1:1,0);return}
  if(ok){H();showCc();if(!hid&&cu)okk();return}
  return}
 if(up||dn||lf||rt){H();mv(lf?-1:rt?1:0,up?-1:dn?1:0);return}
 if(ok){H();okk()}
},true);

/* ===== 4. Branchements sur le script principal ===== */
const _go=window.go;window.go=function(){reset();return _go.apply(this,arguments)};
/* Chaînes en direct : en mode TV, la liste passe dans une colonne à droite du lecteur */
const _live=window.live;window.live=function(){const r=_live.apply(this,arguments);
 if(IS){const s=$('#s18');if(s&&!$('#rcol')){const c=document.createElement('div');c.id='rcol';Q(':scope>*',s).filter(x=>x.id!=='stk').forEach(x=>c.appendChild(x));s.appendChild(c)}}return r};
/* Sur télé : une chaîne choisie s'ouvre directement en plein écran */
const _w=window.watchUrl;window.watchUrl=function(){const r=_w.apply(this,arguments);
 if(IS){const p=P();if(p&&!fsEl()&&!p.classList.contains('fsx'))fsT()}return r};
/* Bandeau EN COURS, bouton Programme et panneau : suivent le lecteur en plein écran */
setInterval(()=>{const p=P(),h=isBig(p)?p.querySelector('.pi'):null;
 [['pgband','#stk'],['pbtn','#app'],['ppnl','#app']].forEach(([id,home])=>{const e=document.getElementById(id),t=h||$(home);if(e&&t&&e.parentElement!==t)t.appendChild(e)})},700);

/* ===== 5. Duo : télécommande entre appareils =====
   Hôte = appareil qui reçoit les commandes (une télé). Contrôleur = appareil qui les envoie (téléphone ou autre télé).
   Chaque télé a SON code personnel (+ un secret gardé sur l'appareil) qu'elle peut révoquer à tout moment. */
const RI='<svg class="ic2" viewBox="0 0 24 24" style="width:22px;height:22px;stroke:var(--red)"><rect x="8" y="2" width="8" height="20" rx="3"/><circle cx="12" cy="8" r="1.6"/><path d="M10 13h4M10 17h4"/></svg>';
const post=async b=>{let j={};try{const r=await fetch('/api/duo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});try{j=await r.json()}catch(e){}j.s=r.status}catch(e){j={ok:false,s:0}}return j};
const errT=j=>j.s===503?'Duo n\'est pas encore activé sur le serveur (base Redis non configurée).':j.s===429?'Trop d\'essais, patientez une minute.':j.s===404?'Code introuvable, révoqué ou expiré.':'Connexion impossible pour le moment.';
const qrLib=()=>window.qrcode?Promise.resolve():new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';s.onload=ok;s.onerror=ko;document.head.appendChild(s)});
const kev=(k,kc)=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,keyCode:kc,bubbles:true,cancelable:true}));

/* -- hôte : code personnel, réception et exécution des commandes -- */
let host=null,sec=null,joined=false,pt=0,lastCmd=0,pn=0;
function run(c){const p=P();
 if(c==='up')kev('ArrowUp',38);else if(c==='down')kev('ArrowDown',40);else if(c==='left')kev('ArrowLeft',37);else if(c==='right')kev('ArrowRight',39);
 else if(c==='ok')kev('Enter',13);else if(c==='back')kev('Escape',27);else if(c==='prog')kev('p',80);
 else if(c==='chp'||c==='chn'){if(cur==='s18'&&p)chStep(c==='chp'?-1:1)}
 else if(c==='home'){if(open('duo'))duoClose();if(isBig(p))fsT();go('s18')}}
function upd(){const e=$('#dst');if(e){e.className='dst'+(joined?' ok':'');e.textContent=joined?'✓ Un appareil est connecté':'En attente d\'un appareil…'}}
/* Sondage adaptatif (économise les requêtes Redis) : lent au repos, rapide quand on pilote ou que l'écran Duo est ouvert */
function sched(){clearTimeout(pt);pt=setTimeout(tick,open('duo')?1500:!joined?5000:(Date.now()-lastCmd<20000?900:2500))}
function dropHost(){host=null;sec=null;joined=false;clearTimeout(pt);ls.s('hduoh',null);ls.s('hduos',null)}
async function tick(){if(!host)return;const j=await post({a:'poll',code:host,secret:sec,k:(pn++%300===0)?1:0});
 if(j.s===404||j.s===403){dropHost();upd();return}
 if(j.ok){joined=j.joined;if((j.cmds||[]).length){lastCmd=Date.now();j.cmds.forEach(run)}upd()}
 sched()}
async function hostStart(){if(host)return host;const c=ls.g('hduoh'),s2=ls.g('hduos');
 if(c&&s2){const j=await post({a:'poll',code:c,secret:s2,k:1});
  if(j.ok){host=c;sec=s2;joined=j.joined;(j.cmds||[]).forEach(run);sched();return c}
  if(j.s===404||j.s===403){ls.s('hduoh',null);ls.s('hduos',null)}else throw j}
 const j=await post({a:'create'});if(!j.ok)throw j;host=j.code;sec=j.secret;joined=false;ls.s('hduoh',host);ls.s('hduos',sec);sched();return host}
async function revokeHost(){const j=await post({a:'revoke',code:host,secret:sec});if(j.ok||j.s===404){dropHost();return true}return false}
async function showHost(b){b.innerHTML='<p class="dst">Chargement de votre code…</p>';b.onclick=null;
 try{const c=await hostStart();let qr='';
  try{await qrLib();const q=qrcode(0,'M');q.addData(location.origin+'/?duo='+c);q.make();qr=`<div class="qrb">${q.createImgTag(6,0)}</div>`}catch(e){}
  b.innerHTML=`<p>Votre code personnel. Scannez-le avec l'appareil photo d'un téléphone, ou saisissez-le sur un autre appareil : Paramètres › Duo${IS?' › Piloter une télé':''}.</p>${qr}<div class="dcode">${c.slice(0,3)} ${c.slice(3)}</div><p class="dst" id="dst"></p><div class="dact"><button class="btn g" type="button" data-act="revoke">Révoquer ce code</button></div>`;upd();
  let armT=0;b.onclick=async e=>{const x=e.target.closest('[data-act]');if(!x)return;
   if(x.dataset.act==='revoke'){if(!x.dataset.arm){x.dataset.arm=1;x.textContent='Confirmer : déconnecter tous les appareils';clearTimeout(armT);armT=setTimeout(()=>{x.dataset.arm='';x.textContent='Révoquer ce code'},5000);return}
    x.disabled=true;if(await revokeHost()){b.onclick=null;b.innerHTML='<p class="dst ok">✓ Code révoqué. Les appareils connectés sont déconnectés.</p><div class="dact"><button class="btn" type="button" data-act="new">Générer un nouveau code</button></div>';b.onclick=ev=>{if(ev.target.closest('[data-act=new]'))showHost(b)}}else{x.disabled=false;x.dataset.arm='';x.textContent='Révoquer ce code';toast('Révocation impossible pour le moment')}}}}
 catch(j){b.innerHTML=`<p class="dst er">${errT(j||{})}</p>`}}

/* -- contrôleur : saisie du code (ou scan), puis télécommande -- */
const RK=[['',''],['up','▲'],['',''],['left','◀'],['ok','OK'],['right','▶'],['',''],['down','▼'],['','']];
function remote(b,c){b.innerHTML=`<p class="dst ok">✓ Connecté</p><div class="dpad">${RK.map(([k,l])=>k?`<button type="button" data-c="${k}"${k==='ok'?' class="ok"':''}>${l}</button>`:'<span></span>').join('')}</div><div class="dk"><button type="button" data-c="back">‹ Retour</button><button type="button" data-c="home">Accueil</button><button type="button" data-c="chp">Chaîne −</button><button type="button" data-c="chn">Chaîne +</button><button type="button" data-c="prog">Programme</button><button type="button" data-c="_off">Déconnecter</button></div><p class="dst" id="dmsg"></p>`;
 b.onclick=async e=>{const x=e.target.closest('[data-c]');if(!x)return;const k=x.dataset.c;
  if(k==='_off'){ls.s('hduor',null);b.onclick=null;enter(b);return}
  if(navigator.vibrate)navigator.vibrate(12);
  const j=await post({a:'send',code:c,cmd:k});if(!j.ok){const m=$('#dmsg');if(j.s===404){ls.s('hduor',null);b.onclick=null;enter(b,'Ce code a été révoqué ou a expiré. Saisissez le nouveau code.')}else if(m){m.className='dst er';m.textContent=errT(j)}}}}
async function join(b,c){if(c===host){enter(b,'C\'est le code de cet appareil : saisissez celui de l\'autre.');return}
 const j=await post({a:'join',code:c});if(j.ok){ls.s('hduor',c);remote(b,c)}else enter(b,errT(j))}
function enter(b,msg){const pad=IS?`<div class="dnum">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-k="${n}">${n}</button>`).join('')}<button type="button" data-k="del">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="ok">OK</button></div>`:'';
 b.innerHTML=`<p>Saisissez le code à 6 chiffres affiché sur l'autre appareil${IS?'':', ou scannez son QR code avec l\'appareil photo du téléphone'}.</p><input class="dcin" id="duoc" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="······" autocomplete="one-time-code"${IS?' readonly':''}>${pad}<p class="dst er" id="dmsg">${msg||''}</p><div class="dact"><button class="btn" type="button" id="duog">Connecter</button></div>`;
 const i=$('#duoc'),g=()=>{const v=i.value.replace(/\D/g,'');if(v.length!==6){$('#dmsg').textContent='Le code doit faire 6 chiffres.';return}join(b,v)};
 i.oninput=()=>{i.value=i.value.replace(/\D/g,'');if(i.value.length===6)g()};$('#duog').onclick=g;
 b.onclick=e=>{const x=e.target.closest('[data-k]');if(!x)return;const k=x.dataset.k;if(k==='del')i.value=i.value.slice(0,-1);else if(k==='ok')g();else if(i.value.length<6){i.value+=k;if(i.value.length===6)g()}}}

/* -- écran Duo -- */
function duoUI(tab){const b=$('#duob');if(!IS)tab='ctl';ls.s('hduotab',tab);
 b.innerHTML=`<h2>Duo</h2>${IS?`<div class="dtabs"><button type="button" data-tab="host" class="${tab==='host'?'a':''}">Mon code</button><button type="button" data-tab="ctl" class="${tab==='ctl'?'a':''}">Piloter une télé</button></div>`:''}<div id="dbody"></div>`;
 const t=b.querySelector('.dtabs');if(t)t.onclick=e=>{const x=e.target.closest('[data-tab]');if(x)duoUI(x.dataset.tab)};
 const body=$('#dbody');if(tab==='host')showHost(body);else{const c=ls.g('hduor');if(c)join(body,c);else enter(body)}}
window.duoOpen=function(tab){let d=$('#duo');
 if(!d){d=document.createElement('div');d.id='duo';d.setAttribute('role','dialog');d.setAttribute('aria-label','Duo');d.innerHTML='<button class="x" type="button" onclick="duoClose()" aria-label="Fermer">✕</button><div id="duob"></div>';$('#app').appendChild(d)}
 d.classList.add('on');duoUI(tab||ls.g('hduotab')||(IS?'host':'ctl'));if(host)sched()};
window.duoClose=function(){const d=$('#duo');if(d)d.classList.remove('on');reset();if(host)sched()};

/* Entrée « Duo » dans les Paramètres */
const _set=window.settings;window.settings=function(){_set.apply(this,arguments);
 const h=Q('h3',$('#s17')).find(x=>x.textContent.trim()==='Compte');
 if(h)h.insertAdjacentHTML('beforebegin',`<h3>Duo</h3><div class="it" onclick="duoOpen()"><b style="display:flex;align-items:center;gap:10px;font-weight:600">${RI}Duo <small style="color:var(--mut);font-weight:400">${IS?'Mon code · piloter une télé':'Télécommande du téléphone'}</small></b><span>›</span></div>`)};

/* Reprise automatique : la télé reprend son code personnel ; le téléphone ouvre Duo via le QR code (?duo=123456) */
if(IS&&ls.g('hduoh')&&ls.g('hduos'))hostStart().catch(()=>{});
const dp=new URLSearchParams(location.search).get('duo');
if(dp&&/^\d{6}$/.test(dp)&&!IS){history.replaceState(null,'',location.pathname);setTimeout(()=>{duoOpen('ctl');join($('#dbody'),dp)},2800)}
})();
