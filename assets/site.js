(function(){
var GA_ID=""; /* identifiant de mesure public, ex: G-XXXXXXXXXX. Vide = aucun traceur, aucun bandeau */
var KEY="pp_consent",MAX=180*864e5;
function get(){try{var v=JSON.parse(localStorage.getItem(KEY));if(v&&Date.now()-v.t<MAX)return v.a}catch(e){}return null}
function set(a){try{localStorage.setItem(KEY,JSON.stringify({a:a,t:Date.now()}))}catch(e){}}
function loadGA(){if(!GA_ID||window.__ga)return;window.__ga=1;var s=document.createElement("script");s.async=1;s.src="https://www.googletagmanager.com/gtag/js?id="+GA_ID;document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function g(){dataLayer.push(arguments)}g("js",new Date());g("config",GA_ID,{anonymize_ip:true,cookie_expires:34128000,allow_google_signals:false,allow_ad_personalization_signals:false})}
function wipe(){document.cookie.split(";").forEach(function(c){var n=c.split("=")[0].trim();if(n.indexOf("_ga")===0){document.cookie=n+"=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";document.cookie=n+"=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain="+location.hostname}})}
function banner(){var d=document.createElement("div");d.id="cb";d.setAttribute("role","dialog");d.setAttribute("aria-label","Choix des cookies");
d.innerHTML='<p>Nous utilisons Google Analytics pour mesurer l\'audience, uniquement si vous acceptez. Refuser est aussi simple qu\'accepter. <a href="/cookies">En savoir plus</a></p><button class="btn sec" type="button" data-c="0">Refuser</button><button class="btn sec" type="button" data-c="1">Accepter</button>';
d.addEventListener("click",function(e){var c=e.target.getAttribute("data-c");if(c===null)return;set(c==="1"?"y":"n");if(c==="1")loadGA();else wipe();d.remove()});document.body.appendChild(d);d.querySelector("button").focus()}
var c=get();if(GA_ID){if(c==="y")loadGA();else if(c===null)banner()}
else{var m=document.querySelectorAll("[data-cm]");for(var i=0;i<m.length;i++)m[i].hidden=true}
document.addEventListener("click",function(e){if(e.target.closest("[data-cm]")){e.preventDefault();var o=document.getElementById("cb");if(o)o.remove();banner()}});
var f=document.getElementById("cf");if(!f)return;var E=f.elements;E.t.value=Date.now();
f.addEventListener("submit",function(e){var ok=true;function chk(el,msg,bad){document.getElementById(el.id+"-e").textContent=bad?msg:"";el.setAttribute("aria-invalid",bad?"true":"false");if(bad)ok=false}
chk(E.name,"Indiquez votre nom (2 caractères minimum).",E.name.value.trim().length<2);
chk(E.email,"Indiquez une adresse e-mail valide.",!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(E.email.value.trim()));
chk(E.message,"Votre message doit faire au moins 10 caractères.",E.message.value.trim().length<10);
chk(E.consent,"Cochez la case pour continuer.",!E.consent.checked);
if(!ok){e.preventDefault();return}
if(!window.fetch)return;e.preventDefault();var b=f.querySelector("button[type=submit]");b.disabled=true;
fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({name:E.name.value,email:E.email.value,message:E.message.value,consent:"on",website:E.website.value,t:E.t.value})})
.then(function(r){return r.json()}).then(function(j){if(j.ok)location.href="/merci";else throw 0}).catch(function(){b.disabled=false;document.getElementById("form-e").textContent="Envoi direct indisponible : votre messagerie s'ouvre pour envoyer le message.";location.href="mailto:primepurgetech@gmail.com?subject="+encodeURIComponent("Message du site : "+E.name.value)+"&body="+encodeURIComponent(E.message.value+"\n\n"+E.name.value+" ("+E.email.value+")")})})})();