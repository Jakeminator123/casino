// The studio's tabs. Every page loads this module: it tells the server that the page is open and does what the server
// says (tools/tab-registry.ts). Any number of tabs may be open at once (Jakob 2026-11-25); a page an agent asks for
// (node tools/preview.ts --open <page>) is shown in the newest of them instead of in a new tab. When the server stops,
// every tab closes itself, or goes blank where the browser will not let a page close its tab, so that nothing keeps
// playing against a server that is gone; before a restart the tabs wait for the new server and reload. A page driven by
// a test (headless Chrome, or ?robot=1) only sends the old sign of life and is never the tab a page is shown in;
// ?robot=0 makes such a page behave as a person's.
// A page inside a frame (the studio's Casino view plays game.html in an iframe) is part of the page around it, which holds
// the tab's stream: it too only sends the old sign of life, whatever ?robot says, for as the newest page it would be the
// one a page is shown in, inside the frame instead of in the tab.
import {startInteractionDiagnostics} from './interaction-diagnostics.ts';
startInteractionDiagnostics();
const here=()=>location.pathname+location.search+location.hash;
const asked=new URLSearchParams(location.search).get('robot');
const robot=asked==='1'||(asked!=='0'&&(navigator.webdriver||/HeadlessChrome/.test(navigator.userAgent)));
const framed=window.top!==window;
if(robot||framed){const keepAlive=()=>fetch('/heartbeat',{method:'POST'}).catch(()=>{});keepAlive();setInterval(keepAlive,15000);}
else{
 const id=crypto.randomUUID?.()??Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('');
 const events=new EventSource(`/tab/events?id=${id}&page=${encodeURIComponent(here())}`);
 let touched=0;for(const type of ['pointerdown','keydown','wheel'])addEventListener(type,()=>{touched=Date.now();},{capture:true,passive:true});
 // What is left of a page that could not close its tab when the server stopped: a new, empty document, so that nothing of
 // the old page keeps running.
 const blank=()=>{
  const page=`<!doctype html><html lang="sv"><meta charset="utf-8"><title>Dealer · servern är stoppad</title><body style="margin:0;height:100vh;display:grid;place-items:center;background:#0f1012;color:#a2a8b0;font:15px system-ui,'Segoe UI',sans-serif"><p>Servern är stoppad. Starta den med npm start.</p></body></html>`;
  location.replace(URL.createObjectURL(new Blob([page],{type:'text/html'})));
 };
 events.addEventListener('retire',event=>{
  events.close();
  for(const media of document.querySelectorAll('video,audio'))(media as HTMLMediaElement).pause();
  const {reason}=JSON.parse((event as MessageEvent).data);
  // A restart of the server: the tab stays, waits for the new server and reloads. Only if none comes does it go blank.
  if(reason==='restart'){void(async()=>{await new Promise(done=>setTimeout(done,1500));
   for(let i=0;i<60;i++){if(await fetch('/health',{cache:'no-store'}).then(r=>r.ok,()=>false)){location.reload();return;}await new Promise(done=>setTimeout(done,500));}
   blank();})();return;}
  window.close();setTimeout(blank,250); // a tab that closed never runs the timer
 });
 // A page to show (this is the newest tab). It is shown at once when nobody is using the tab; a person in the middle of
 // something is asked first.
 events.addEventListener('navigate',event=>{
  const {url}=JSON.parse((event as MessageEvent).data),go=()=>{if(url===here())location.reload();else location.assign(url);};
  if(document.hidden||Date.now()-touched>15000){go();return;}
  document.getElementById('lab-tab-offer')?.remove();
  const box=document.createElement('div'),text=document.createElement('span'),show=document.createElement('button'),later=document.createElement('button');
  box.id='lab-tab-offer';box.setAttribute('role','status');
  box.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;display:flex;gap:10px;align-items:center;padding:10px 12px 10px 16px;border-radius:12px;background:#16181b;color:#f1f2f4;border:1px solid #d9b96a;box-shadow:0 10px 30px rgba(0,0,0,.5);font:14px system-ui,"Segoe UI",sans-serif';
  const button='border-radius:8px;padding:6px 14px;font:inherit;cursor:pointer;border:1px solid #d9b96a;';
  text.textContent='Nytt att titta på';show.textContent='Visa';later.textContent='Inte nu';
  show.style.cssText=button+'background:#d9b96a;color:#1a1404;font-weight:600';later.style.cssText=button+'background:transparent;color:#f1f2f4;border-color:#373c43';
  show.addEventListener('click',go);later.addEventListener('click',()=>box.remove());
  box.append(text,show,later);document.body.append(box);
 });
}
