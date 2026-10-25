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
window.IS_TV=IS;
/* Mise en page « grand écran » (plein écran, colonnes, barre à gauche) : sur une télé, OU sur tout écran large en paysage (ordinateur, tablette, navigateur en mode ordinateur) */
const WIDE=()=>innerWidth>=1000&&innerWidth>innerHeight*1.2;
const tvk=()=>document.documentElement.style.setProperty('--tk',Math.max(.5,innerHeight/540));
function lay(){const on=IS||WIDE();document.body.classList.toggle('tv',on);document.body.classList.toggle('tvmode',on);if(on)tvk();tvCols()}
/* Liste des chaînes : colonne à droite du lecteur dès que la mise en page « grand écran » est active (télé détectée OU écran large) */
function tvCols(){const s=$('#s18');if(!s)return;const on=document.body.classList.contains('tv'),c=$('#rcol');
 if(on&&!c&&$('#stk')){const d=document.createElement('div');d.id='rcol';Q(':scope>*',s).filter(x=>x.id!=='stk').forEach(x=>d.appendChild(x));s.appendChild(d)}
 else if(!on&&c){while(c.firstChild)s.insertBefore(c.firstChild,c);c.remove()}}
lay();addEventListener('resize',lay);

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
body.tv #s18>#stk{width:57%;position:sticky;top:0}body.tv #rcol{flex:1;min-width:0;overflow:hidden}
body.tv .scr.main{overflow-x:hidden}body.tv #s18>*{min-width:0}
body.tv .pw.fs .pi>:not(.stg):not(.wmk){zoom:var(--tk,1)}
.tvf{outline:3px solid #fff!important;outline-offset:3px;box-shadow:0 0 0 7px color-mix(in srgb,var(--red) 75%,transparent),0 12px 30px #000!important;scale:1.05;position:relative;z-index:4;border-radius:10px}
.tb .tvf,.cn.tvf,.rb.tvf,.stb.tvf{border-radius:14px}
.pi>.pg{top:46px;bottom:auto;background:none;padding:4px 14px;z-index:9}
.pi>.pbtn{bottom:150px;right:14px;z-index:9}
.pw.hid>.pi>.pbtn,.pw.hid>.pi>.pg{opacity:0;pointer-events:none}
.pi>.pp{z-index:20}
#duo{position:absolute;inset:0;z-index:66;background:var(--bg);display:none;flex-direction:column;align-items:center;padding:56px 22px 24px;overflow-y:auto;text-align:center}
#duo.on{display:flex}#duo h2{margin:0 0 8px;font-size:22px}#duo p{max-width:300px;margin:6px auto}
#duo .x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:0;background:var(--card);color:var(--txt);font-size:16px;cursor:pointer;z-index:3}
#duob{width:100%;display:flex;flex-direction:column;align-items:center}
.qrb{background:#fff;padding:10px;border-radius:14px;margin:12px 0;line-height:0}.qrb img{width:240px;max-width:100%;height:auto;display:block}
#scan{position:absolute;top:0;left:0;right:0;bottom:0;z-index:80;background:#000;display:none;flex-direction:column;align-items:center;justify-content:flex-end;padding:0 24px 40px}#scan.on{display:flex}
#scan video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}
#scan .sf{position:absolute;top:50%;left:50%;width:62%;max-width:320px;aspect-ratio:1;transform:translate(-50%,-60%);border:3px solid #fff;border-radius:20px;box-shadow:0 0 0 999px #0008}
#scan p{position:relative;color:#fff;margin-bottom:12px;text-shadow:0 2px 6px #000}#scan .btn{position:relative;width:auto;padding:0 28px}
.dcode{font-size:42px;font-weight:800;letter-spacing:6px;margin:10px 0 4px;font-variant-numeric:tabular-nums}
.dst{font-size:13px;color:var(--mut)}.dst.ok{color:#1db954}.dst.er{color:#ff5252}
.dcin{width:100%;max-width:260px;background:var(--card);border:1px solid var(--line);border-radius:10px;color:var(--txt);font:inherit;font-size:28px;letter-spacing:8px;text-align:center;padding:12px;outline:0;margin:14px 0 4px}
.dcin:focus{border-color:var(--red)}
.dtabs{display:flex;gap:8px;margin:4px 0 14px}.dtabs button{border:1px solid var(--line);background:var(--card);color:var(--txt);border-radius:10px;padding:10px 14px;font:inherit;font-size:13px;cursor:pointer}.dtabs .a{background:var(--red);border-color:var(--red);color:#fff}
#dbody{width:100%;display:flex;flex-direction:column;align-items:center}
.dnum{display:grid;grid-template-columns:repeat(3,66px);gap:8px;margin:10px 0}.dnum button{height:52px;border:0;border-radius:12px;background:var(--card);color:var(--txt);font-size:20px;font-weight:600;cursor:pointer}
.dact{display:flex;flex-direction:column;gap:8px;width:100%;max-width:300px;margin-top:10px}.dact .btn{margin:0}
/* Télécommande plein écran (sans cadre) */
#duo.rem{padding:0;overflow:hidden;align-items:stretch;background:#000}
#duo.rem h2,#duo.rem .dtabs{display:none}
#duo.rem #duob,#duo.rem #dbody{width:100%;height:100%}
#duo.rem .x{top:max(12px,env(safe-area-inset-top));background:#1c1c1e;color:#fff}
.drm{box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:10px;padding:max(12px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));background:linear-gradient(180deg,#000 55%,#05324a 100%);color:#fff;overflow:hidden}
.drm button{font-family:inherit;-webkit-tap-highlight-color:transparent}
.drm button:active{transform:scale(.94)}
.drh{width:100%;display:flex;align-items:center;justify-content:space-between;font-size:18px;font-weight:600;min-height:40px}
.drh i{width:34px}
.drof{width:34px;height:34px;border:0;background:none;color:#ff3b30;font-size:24px;cursor:pointer;padding:0}
.drt{display:flex;gap:10px;width:100%;max-width:360px}
.drt button{flex:1;height:52px;border:0;border-radius:18px;background:#1c1c1e;color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.drt small{font-size:11px;color:#bbb}
.drp{position:relative;width:min(70vw,36vh);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 35%,#4fdcff,#00b4f0 60%,#0094d0);box-shadow:0 10px 40px #00b4f055;flex:none}
.drp .a{position:absolute;width:30%;height:30%;border:0;background:none;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.drp .a svg{width:36px;height:36px;stroke:#063447;stroke-width:2.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
.drp .u{top:2%;left:35%}.drp .d{bottom:2%;left:35%}.drp .l{left:2%;top:35%}.drp .r{right:2%;top:35%}
.drp .d svg{transform:rotate(180deg)}.drp .l svg{transform:rotate(-90deg)}.drp .r svg{transform:rotate(90deg)}
.drp .ok{position:absolute;left:33%;top:33%;width:34%;height:34%;border-radius:50%;border:2px solid #fff;background:none;color:#fff;font-size:22px;font-weight:600;cursor:pointer}
.drch{display:flex;align-items:center;justify-content:space-between;width:min(80vw,320px);height:64px;border-radius:40px;background:#1c1c1e;padding:0 8px;flex:none}
.drch button{width:52px;height:52px;border:0;border-radius:50%;background:none;color:#fff;font-size:28px;cursor:pointer}
.drch span{font-size:15px;color:#ddd}
.drpad{flex:1;width:100%;max-width:360px;border-radius:28px;background:#111;border:2px dashed #00b4f088;display:flex;align-items:center;justify-content:center;text-align:center;color:#8ad;touch-action:none;user-select:none;-webkit-user-select:none;line-height:1.6}
.drs{display:flex;background:#1c1c1e;border-radius:30px;padding:5px;width:100%;max-width:360px;flex:none}
.drs button{flex:1;height:46px;border:0;border-radius:26px;background:none;color:#fff;font-size:14px;cursor:pointer}
.drs .a{background:#00b4f0;color:#04283a;font-weight:700}
.drm .dst{margin:0;min-height:16px}
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
document.addEventListener('keydown',e=>{
 if(!(IS||host))return;
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
const _live=window.live;window.live=function(){const r=_live.apply(this,arguments);tvCols();return r};
/* Sur télé : une chaîne choisie s'ouvre directement en plein écran */
const _w=window.watchUrl;window.watchUrl=function(){const r=_w.apply(this,arguments);
 if(IS){const p=P();if(p&&!fsEl()&&!p.classList.contains('fsx'))fsT()}return r};
/* Bandeau EN COURS, bouton Programme et panneau : suivent le lecteur en plein écran */
setInterval(()=>{const p=P(),h=isBig(p)?p.querySelector('.pi'):null;
 [['pgband','#stk'],['pbtn','#app'],['ppnl','#app']].forEach(([id,home])=>{const e=document.getElementById(id),t=h||$(home);if(e&&t&&e.parentElement!==t)t.appendChild(e)})},700);

/* ===== 5. Duo : télécommande entre appareils (télé ↔ téléphone, télé ↔ télé, téléphone ↔ téléphone) =====
   Hôte = appareil qui reçoit les commandes. Contrôleur = appareil qui les envoie.
   Chaque appareil a SON code personnel (+ un secret gardé sur l'appareil), SON code QR et SON style de QR ; il peut révoquer son code. */
const RI='<svg class="ic2" viewBox="0 0 24 24" style="width:22px;height:22px;stroke:var(--red)"><rect x="8" y="2" width="8" height="20" rx="3"/><circle cx="12" cy="8" r="1.6"/><path d="M10 13h4M10 17h4"/></svg>';
const post=async b=>{let j={};try{const r=await fetch('/api/duo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});try{j=await r.json()}catch(e){}j.s=r.status}catch(e){j={ok:false,s:0}}return j};
const errT=j=>j.s===503?'Duo n\'est pas encore activé sur le serveur (base Redis non configurée).':j.s===429?'Trop d\'essais, patientez une minute.':j.s===404?'Code introuvable, révoqué ou expiré.':'Connexion impossible pour le moment.';
const jsLib=(u,t)=>window[t]?Promise.resolve():new Promise((ok,ko)=>{const x=document.createElement('script');x.src=u;x.onload=ok;x.onerror=ko;document.head.appendChild(x)});
const qrLib=()=>jsLib('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js','qrcode');
const jsqrLib=()=>jsLib('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js','jsQR');
const kev=(k,kc)=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,keyCode:kc,bubbles:true,cancelable:true}));

/* -- styles de code QR : chaque appareil a le sien (choisi d'après son code, modifiable) -- */
const QSTY=[['classic','Classique'],['dots','Points'],['hex','Alvéoles'],['half','Demi-teinte'],['tv','Télé']];
const qStyle=c=>{const v=ls.g('hduosty');return QSTY.some(x=>x[0]===v)?v:QSTY[(+c||0)%QSTY.length][0]};
function qrMatrix(t){const q=qrcode(0,'H');q.addData(t);q.make();const n=q.getModuleCount(),m=[];for(let r=0;r<n;r++){m[r]=[];for(let c=0;c<n;c++)m[r][c]=q.isDark(r,c)}return m}
const isEye=(r,c,n)=>(r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7);
function rr(g,x,y,w,h,r,f){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else{g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}g.fillStyle=f;g.fill()}
/* Demi-teinte : chaque module = 3×3 points ; le point central porte la donnée, les autres dessinent le logo HE'S TV */
function half(g,m,x0,y0,u){const n=m.length,N=n*3,s=u/3,K='#111',o=document.createElement('canvas');o.width=o.height=N;const h=o.getContext('2d');
 h.fillStyle='#fff';h.fillRect(0,0,N,N);
 const gr=h.createRadialGradient(N/2,N/2,N*.04,N/2,N/2,N*.42);gr.addColorStop(0,'#000');gr.addColorStop(.7,'#333');gr.addColorStop(1,'#bbb');
 h.fillStyle=gr;h.beginPath();h.arc(N/2,N/2,N*.42,0,6.2832);h.fill();
 h.fillStyle='#fff';h.font='bold '+Math.round(N*.36)+'px system-ui,sans-serif';h.textAlign='center';h.textBaseline='middle';h.fillText('H',N/2,N/2+N*.02);
 const d=h.getImageData(0,0,N,N).data,B=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  const fixed=(r<8&&c<8)||(r<8&&c>=n-8)||(r>=n-8&&c<8)||r===6||c===6||(n>=25&&r>=n-9&&r<=n-5&&c>=n-9&&c<=n-5);
  const x=x0+c*u,y=y0+r*u;
  if(fixed){if(m[r][c]){g.fillStyle=K;g.fillRect(x,y,u,u)}continue}
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){
   let dark;if(i===1&&j===1)dark=m[r][c];else{const px=c*3+j,py=r*3+i,lum=d[(py*N+px)*4];dark=lum<128+(B[(py%4)*4+(px%4)]-7.5)*9}
   if(dark){g.fillStyle=K;g.fillRect(x+j*s,y+i*s,s+.5,s+.5)}}}}
function paint(g,m,x0,y0,u,st){const n=m.length,K='#111',AC='#b71c1c';
 if(st==='half')return half(g,m,x0,y0,u);
 const round=st==='hex'||st==='tv',dots=st==='dots';
 [[0,0],[0,n-7],[n-7,0]].forEach(([r,c])=>{const x=x0+c*u,y=y0+r*u;
  if(round){rr(g,x,y,7*u,7*u,2.2*u,K);rr(g,x+u,y+u,5*u,5*u,1.4*u,'#fff');rr(g,x+2*u,y+2*u,3*u,3*u,.9*u,AC)}
  else{g.fillStyle=K;g.fillRect(x,y,7*u,7*u);g.fillStyle='#fff';g.fillRect(x+u,y+u,5*u,5*u);g.fillStyle=dots?K:AC;g.fillRect(x+2*u,y+2*u,3*u,3*u)}});
 g.fillStyle=K;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(!m[r][c]||isEye(r,c,n))continue;const x=x0+c*u,y=y0+r*u;
  if(dots)g.fillRect(x+u*.19,y+u*.19,u*.62,u*.62);
  else if(round){g.beginPath();g.arc(x+u/2,y+u/2,u*.54,0,6.2832);g.fill();
   if(c+1<n&&m[r][c+1]&&!isEye(r,c+1,n))g.fillRect(x+u/2,y+u*.16,u,u*.68);
   if(r+1<n&&m[r+1][c]&&!isEye(r+1,c,n))g.fillRect(x+u*.16,y+u/2,u*.68,u)}
  else g.fillRect(x,y,u,u)}}
function qrCanvas(text,st,size){const m=qrMatrix(text),n=m.length,cv=document.createElement('canvas');let g;
 if(st==='tv'){/* petite télé avec antennes et son étiquette */
  const u=Math.floor(size*.74/(n+4)),su=u*(n+4),W=size,by=Math.round(size*.1),bx=Math.round(size*.04),bh=su+Math.round(size*.2),H=Math.round(by+bh+size*.04);
  cv.width=W;cv.height=H;g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);
  g.strokeStyle='#111';g.lineWidth=size*.014;g.lineCap='round';g.beginPath();g.moveTo(W*.4,by);g.lineTo(W*.3,by-size*.08);g.moveTo(W*.6,by);g.lineTo(W*.7,by-size*.08);g.stroke();
  rr(g,bx,by,W-2*bx,bh,size*.07,'#111');
  const sx=(W-su)/2,sy=by+size*.04;rr(g,sx,sy,su,su,size*.04,'#fff');paint(g,m,sx+2*u,sy+2*u,u,'tv');
  const ly=sy+su+size*.025;rr(g,W*.3,ly,W*.4,size*.1,size*.03,'#d32f2f');
  g.fillStyle='#fff';g.font='bold '+Math.round(size*.062)+'px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText("HE'S TV",W/2,ly+size*.052);return cv}
 const pad=2,u=Math.floor(size/(n+pad*2)),S=u*(n+pad*2);cv.width=cv.height=S;g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,S,S);paint(g,m,pad*u,pad*u,u,st);return cv}
const qrBox=(c,st)=>{try{return `<img alt="Code QR personnel" src="${qrCanvas(location.origin+'/?duo='+c,st,480).toDataURL('image/png')}">`}catch(e){return '<p class="dst er">Code QR indisponible (réseau)</p>'}};

/* -- scanner de code QR (caméra) : détecteur natif du navigateur, sinon bibliothèque jsQR -- */
let scStream=null,scT=0;
const codeOf=t=>{t=String(t||'').trim();if(/^\d{6}$/.test(t))return t;try{const c=new URL(t).searchParams.get('duo');if(c&&/^\d{6}$/.test(c))return c}catch(e){}return ''};
function scanClose(){clearInterval(scT);if(scStream){scStream.getTracks().forEach(t=>t.stop());scStream=null}const ov=$('#scan');if(ov)ov.classList.remove('on')}
async function scanOpen(ok,err){let ov=$('#scan');
 if(!ov){ov=document.createElement('div');ov.id='scan';ov.innerHTML='<video playsinline muted></video><div class="sf"></div><p>Placez le code QR dans le cadre</p><button class="btn g" type="button" id="scx">Annuler</button>';$('#app').appendChild(ov)}
 ov.classList.add('on');$('#scx').onclick=scanClose;const v=ov.querySelector('video');
 try{scStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})}catch(e){scanClose();err('Caméra refusée ou indisponible : autorisez-la dans le navigateur, ou saisissez le code.');return}
 v.srcObject=scStream;try{await v.play()}catch(e){}
 let det=null;if(window.BarcodeDetector){try{det=new BarcodeDetector({formats:['qr_code']})}catch(e){}}
 if(!det){try{await jsqrLib()}catch(e){scanClose();err('Scanner indisponible (réseau) : saisissez le code.');return}}
 const cv=document.createElement('canvas'),x=cv.getContext('2d');let busy=0;
 scT=setInterval(async()=>{if(busy||v.readyState<2)return;busy=1;
  try{let t='';
   if(det){const r=await det.detect(v);t=r[0]?r[0].rawValue:''}
   else{const k=Math.min(1,480/v.videoWidth);cv.width=Math.round(v.videoWidth*k);cv.height=Math.round(v.videoHeight*k);x.drawImage(v,0,0,cv.width,cv.height);const d=x.getImageData(0,0,cv.width,cv.height),r=jsQR(d.data,d.width,d.height);t=r?r.data:''}
   const c=codeOf(t);if(c){scanClose();ok(c)}}catch(e){}
  busy=0},250)}

/* -- hôte : code personnel, réception et exécution des commandes -- */
let host=null,sec=null,joined=false,pt=0,lastCmd=0,pn=0;
function run(c){const p=P();
 if(c==='up')kev('ArrowUp',38);else if(c==='down')kev('ArrowDown',40);else if(c==='left')kev('ArrowLeft',37);else if(c==='right')kev('ArrowRight',39);
 else if(c==='ok')kev('Enter',13);else if(c==='back')kev('Escape',27);else if(c==='prog')kev('p',80);
 else if(c==='chp'||c==='chn'){if(cur==='s18'&&p)chStep(c==='chp'?-1:1)}
 else if(c==='home'){if(open('duo'))duoClose();if(isBig(p))fsT();go('s18')}
 else if(c==='fav'){if(open('duo'))duoClose();if(isBig(p))fsT();goFav()}
 else if(c==='rnd')rndFr();
 else if(c.slice(0,3)==='ch:')openCh(c.slice(3))}
/* Chaînes en direct commandées à distance : on attend que la liste soit chargée, on filtre, on lance, puis plein écran (paysage) */
let cbusy=0;
async function liveReady(){if(open('duo'))duoClose();if(open('ppnl'))closePP();if(cur!=='s18')go('s18');
 for(let i=0;i<100;i++){const v=$('#vlist');if(v&&v.children.length)break;await new Promise(r=>setTimeout(r,500))}
 return VCH.length>0}
function showLang(l){lc=l;cc='Toutes';VQ='';const q=$('#vq');if(q)q.value='';chips();catChips();drawV()}
function fsAuto(){if(IS)return;const p=P();if(p&&!fsEl()&&!p.classList.contains('fsx'))fsT()}
async function rndFr(){if(cbusy)return;cbusy=1;
 try{if(!await liveReady())return;
  if(lc!=='fra'||cc!=='Toutes'||VQ)showLang('fra');
  let ids=(window.VL||[]).filter(id=>{const c=VCH.find(x=>x[0]===id);return c&&c[5]==='fra'});
  if(!ids.length)ids=VCH.filter(c=>c[5]==='fra').map(c=>c[0]);
  if(!ids.length){toast('Aucune chaîne française trouvée');return}
  let id=ids[Math.floor(Math.random()*ids.length)];
  if(ids.length>1)for(let k=0;k<5&&id===window.LCUR;k++)id=ids[Math.floor(Math.random()*ids.length)];
  watchUrl(id);fsAuto()}
 finally{cbusy=0}}
async function openCh(id){if(cbusy)return;cbusy=1;
 try{if(!await liveReady())return;
  const c=VCH.find(x=>x[0]===id);if(!c){toast('Chaîne introuvable sur cet appareil');return}
  if(!(window.VL||[]).includes(id))showLang(c[5]||'_');
  watchUrl(id);fsAuto()}
 finally{cbusy=0}}
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
 try{const c=await hostStart();try{await qrLib()}catch(e){}const st=qStyle(c);
  b.innerHTML=`<p>Votre code QR personnel. Faites-le scanner par un autre appareil (Duo › Scanner), ou donnez-lui le code.</p><div class="qrb">${qrBox(c,st)}</div><div class="dcode">${c.slice(0,3)} ${c.slice(3)}</div><p class="dst" id="dst"></p><p class="dst">Style de votre QR</p><div class="dtabs" style="flex-wrap:wrap;justify-content:center">${QSTY.map(([k,l])=>`<button type="button" data-sty="${k}" class="${k===st?'a':''}">${l}</button>`).join('')}</div><div class="dact"><button class="btn g" type="button" data-act="revoke">Révoquer ce code</button></div>`;upd();
  let armT=0;b.onclick=async e=>{
   const sy=e.target.closest('[data-sty]');
   if(sy){ls.s('hduosty',sy.dataset.sty);const qb=b.querySelector('.qrb');if(qb)qb.innerHTML=qrBox(host,sy.dataset.sty);b.querySelectorAll('[data-sty]').forEach(z=>z.classList.toggle('a',z===sy));return}
   const x=e.target.closest('[data-act]');if(!x)return;
   if(x.dataset.act==='revoke'){if(!x.dataset.arm){x.dataset.arm=1;x.textContent='Confirmer : déconnecter tous les appareils';clearTimeout(armT);armT=setTimeout(()=>{x.dataset.arm='';x.textContent='Révoquer ce code'},5000);return}
    x.disabled=true;if(await revokeHost()){b.onclick=null;b.innerHTML='<p class="dst ok">✓ Code révoqué. Les appareils connectés sont déconnectés.</p><div class="dact"><button class="btn" type="button" data-act="new">Générer un nouveau code</button></div>';b.onclick=ev=>{if(ev.target.closest('[data-act=new]'))showHost(b)}}else{x.disabled=false;x.dataset.arm='';x.textContent='Révoquer ce code';toast('Révocation impossible pour le moment')}}}}
 catch(j){b.innerHTML=`<p class="dst er">${errT(j||{})}</p>`}}

/* -- contrôleur : scan ou saisie du code, puis télécommande plein écran -- */
const CHV='<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
function remote(b,c){const d=$('#duo');if(d)d.classList.add('rem');
 let mode=ls.g('hduom')==='pad'?'pad':'nav';
 const send=async k=>{if(navigator.vibrate)navigator.vibrate(12);
  const j=await post({a:'send',code:c,cmd:k});
  if(!j.ok){const m=$('#dmsg');if(j.s===404){ls.s('hduor',null);b.onclick=null;enter(b,'Ce code a été révoqué ou a expiré. Scannez ou saisissez le nouveau code.')}else if(m){m.className='dst er';m.textContent=errT(j)}}};
 const draw=()=>{
  b.innerHTML=`<div class="drm">
   <div class="drh"><button type="button" class="drof" data-c="_off" aria-label="Déconnecter">⏻</button><span>Télécommande</span><i></i></div>
   <div class="drt"><button type="button" data-c="back">↩<small>Retour</small></button><button type="button" data-c="home">⌂<small>Accueil</small></button><button type="button" data-c="prog">☰<small>Programme</small></button></div>
   <div class="drt"><button type="button" data-c="fav">★<small>Favoris</small></button><button type="button" data-c="rnd">🎲<small>Chaîne FR au hasard</small></button></div>
   ${mode==='nav'?`<div class="drp"><button type="button" class="a u" data-c="up" aria-label="Haut">${CHV}</button><button type="button" class="a d" data-c="down" aria-label="Bas">${CHV}</button><button type="button" class="a l" data-c="left" aria-label="Gauche">${CHV}</button><button type="button" class="a r" data-c="right" aria-label="Droite">${CHV}</button><button type="button" class="ok" data-c="ok">OK</button></div>
   <div class="drch"><button type="button" data-c="chp" aria-label="Chaîne précédente">−</button><span>Chaîne</span><button type="button" data-c="chn" aria-label="Chaîne suivante">+</button></div>`
   :`<div class="drpad" id="dpad"><p>Glissez pour naviguer<br>Touchez pour valider</p></div>`}
   <div class="drs"><button type="button" data-m="nav" class="${mode==='nav'?'a':''}">Navigation</button><button type="button" data-m="pad" class="${mode==='pad'?'a':''}">Pavé tactile</button></div>
   <p class="dst" id="dmsg"></p></div>`;
  const pd=$('#dpad');
  if(pd){let x0=null,y0=0,ax=0,ay=0,t0=0,moved=0;
   pd.onpointerdown=e=>{try{pd.setPointerCapture(e.pointerId)}catch(x){}x0=ax=e.clientX;y0=ay=e.clientY;t0=Date.now();moved=0;e.preventDefault()};
   pd.onpointermove=e=>{if(x0==null)return;const dx=e.clientX-ax,dy=e.clientY-ay;if(Math.max(Math.abs(dx),Math.abs(dy))<44)return;moved=1;send(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));ax=e.clientX;ay=e.clientY};
   pd.onpointerup=e=>{if(x0!=null&&!moved&&Date.now()-t0<500&&Math.hypot(e.clientX-x0,e.clientY-y0)<14)send('ok');x0=null};
   pd.onpointercancel=()=>{x0=null}}};
 draw();
 b.onclick=e=>{const m=e.target.closest('[data-m]');if(m){mode=m.dataset.m;ls.s('hduom',mode);draw();return}
  const x=e.target.closest('[data-c]');if(!x)return;const k=x.dataset.c;
  if(k==='_off'){ls.s('hduor',null);b.onclick=null;enter(b);return}
  send(k)}}
async function join(b,c){if(c===host){enter(b,'C\'est le code de cet appareil : scannez ou saisissez celui de l\'autre.');return}
 const j=await post({a:'join',code:c});if(j.ok){ls.s('hduor',c);remote(b,c)}else enter(b,errT(j))}
function enter(b,msg){const d=$('#duo');if(d)d.classList.remove('rem');
 const cam=!IS&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia;
 const pad=IS?`<div class="dnum">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-k="${n}">${n}</button>`).join('')}<button type="button" data-k="del">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="ok">OK</button></div>`:'';
 b.innerHTML=`<p>Scannez le code QR de l'autre appareil${IS?'':' avec la caméra'}, ou saisissez son code à 6 chiffres.</p>${cam?'<div class="dact"><button class="btn" type="button" data-act="scan">📷 Scanner un code QR</button></div>':''}<input class="dcin" id="duoc" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="······" autocomplete="one-time-code"${IS?' readonly':''}>${pad}<p class="dst er" id="dmsg">${msg||''}</p><div class="dact"><button class="btn${cam?' g':''}" type="button" id="duog">Connecter</button></div>`;
 const i=$('#duoc'),g=()=>{const v=i.value.replace(/\D/g,'');if(v.length!==6){$('#dmsg').textContent='Le code doit faire 6 chiffres.';return}join(b,v)};
 i.oninput=()=>{i.value=i.value.replace(/\D/g,'');if(i.value.length===6)g()};$('#duog').onclick=g;
 b.onclick=e=>{if(e.target.closest('[data-act=scan]')){scanOpen(code=>join(b,code),m=>{const d=$('#dmsg');if(d)d.textContent=m});return}
  const x=e.target.closest('[data-k]');if(!x)return;const k=x.dataset.k;if(k==='del')i.value=i.value.slice(0,-1);else if(k==='ok')g();else if(i.value.length<6){i.value+=k;if(i.value.length===6)g()}}}

/* -- écran Duo -- */
function duoUI(tab){const b=$('#duob'),dd=$('#duo');if(dd)dd.classList.remove('rem');ls.s('hduotab',tab);
 b.innerHTML=`<h2>Duo</h2><div class="dtabs"><button type="button" data-tab="host" class="${tab==='host'?'a':''}">Mon code QR</button><button type="button" data-tab="ctl" class="${tab==='ctl'?'a':''}">Scanner / saisir</button></div><div id="dbody"></div>`;
 b.querySelector('.dtabs').onclick=e=>{const x=e.target.closest('[data-tab]');if(x){scanClose();duoUI(x.dataset.tab)}};
 const body=$('#dbody');if(tab==='host')showHost(body);else{const c=ls.g('hduor');if(c)join(body,c);else enter(body)}}
window.duoOpen=function(tab){let d=$('#duo');
 if(!d){d=document.createElement('div');d.id='duo';d.setAttribute('role','dialog');d.setAttribute('aria-label','Duo');d.innerHTML='<button class="x" type="button" onclick="duoClose()" aria-label="Fermer">✕</button><div id="duob"></div>';$('#app').appendChild(d)}
 d.classList.add('on');duoUI(tab||ls.g('hduotab')||(IS?'host':'ctl'));if(host)sched()};
window.duoClose=function(){scanClose();const d=$('#duo');if(d)d.classList.remove('on');reset();if(host)sched()};

/* -- téléphone : bouton « envoyer sur la télé » dans le lecteur de chaînes -- */
window.castTv=async function(){const id=window.LCUR;if(!id)return;const c=ls.g('hduor'),p=P(),full=fsEl()||(p&&p.classList.contains('fsx'));
 if(!c){flash('Connectez d\'abord la télé : Duo › Scanner / saisir');if(!full)duoOpen('ctl');return}
 const j=await post({a:'send',code:c,cmd:'ch:'+id});
 if(j.ok)flash('Chaîne envoyée sur la télé ✓');
 else if(j.s===404){ls.s('hduor',null);flash('Code de la télé expiré : reconnectez-vous');if(!full)duoOpen('ctl')}
 else flash(errT(j))};
const TVI='<svg class="ic2" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M9 3l3 3 3-3M10.5 9.5v5l4-2.5z"/></svg>';
const _lu=window.liveUI;
if(_lu)window.liveUI=function(p){_lu.apply(this,arguments);if(IS)return;
 const w=p.querySelector('.fmw'),sp=w&&w.querySelector('.sp');
 if(w&&sp&&!w.querySelector('.cast')){const b=document.createElement('button');b.type='button';b.className='rb cast';b.setAttribute('aria-label','Envoyer sur la télé');b.innerHTML=TVI;b.onclick=()=>window.castTv();sp.insertAdjacentElement('afterend',b)}};

/* Entrée « Duo » dans les Paramètres */
const _set=window.settings;window.settings=function(){_set.apply(this,arguments);
 const h=Q('h3',$('#s17')).find(x=>x.textContent.trim()==='Compte');
 if(h)h.insertAdjacentHTML('beforebegin',`<h3>Duo</h3><div class="it" onclick="duoOpen()"><b style="display:flex;align-items:center;gap:10px;font-weight:600">${RI}Duo <small style="color:var(--mut);font-weight:400">Mon code QR · scanner</small></b><span>›</span></div>`)};

/* Reprise automatique : l'appareil reprend son code personnel ; un QR scanné avec l'appareil photo ouvre l'appli (?duo=123456) */
if(ls.g('hduoh')&&ls.g('hduos'))hostStart().catch(()=>{});
const dp=new URLSearchParams(location.search).get('duo');
if(dp&&/^\d{6}$/.test(dp)){history.replaceState(null,'',location.pathname);setTimeout(()=>{duoOpen('ctl');join($('#dbody'),dp)},2800)}
})();
