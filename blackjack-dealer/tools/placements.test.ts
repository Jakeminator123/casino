import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {defaultPlan,validatePlan,toPixels,fromPixels,quad,flatQuad,motionNodes,constrain,sequence,TARGETS,INTENT_DEFAULTS,SHOE_CARD,WINDOW_CARD,VIEWS,type Intent} from '../src/placement-model.ts';
import {placementStore,StoreError} from './placement-store.ts';

test('pixel-centre transforms are invertible at both image edges and interior',()=>{
 for(const view of ['native','portrait'] as const)for(const point of [{u:0,v:0},{u:1,v:1},{u:.5,v:.5},{u:.234,v:.892}]){
  const px=toPixels(point,view),back=fromPixels(px.x,px.y,view);assert.ok(Math.abs(back.u-point.u)<1e-12);assert.ok(Math.abs(back.v-point.v)<1e-12);
 }assert.deepEqual(toPixels({u:.5,v:.5},'native'),{x:880.5,y:586.5});
});
test('seventeen draft slots have independent view geometry and coherent motion plans',()=>{
 const p=defaultPlan();validatePlan(p);assert.equal(Object.keys(p.targets).length,17);assert.equal(p.targets['D.C2'].intent.turn,false);assert.equal(p.targets['D.C3'].intent.endSide,'FRONT');assert.equal(p.targets['P4.C2'].intent.endSide,'BACK');assert.equal(p.targets['P4.C2'].intent.turn,false);
 const old=structuredClone(p.targets['P4.C2'].geometry.portrait);p.targets['P4.C2'].geometry.native.u=.7;assert.deepEqual(p.targets['P4.C2'].geometry.portrait,old);
 const text=sequence('P4.C2',{takeHand:'LH',startSide:'BACK',endSide:'BACK',pass:true,turn:false,...INTENT_DEFAULTS});assert.match(text,/PASS\(LH>RH,BACK\)/);assert.match(text,/RELEASE\(RH\)/);assert.doesNotMatch(text,/\bTURN\(/);assert.match(text,/RETURN\(SHOE_READY\)$/);
});

test('legacy plans gain only D.C3 and preserve every saved user adjustment',()=>{
 const p=defaultPlan();delete p.targets['D.C3'];
 p.targets['P6.C1'].geometry.native.u=.7345;p.targets['D.C2'].material.gloss=.71;
 const before=structuredClone(p.targets);validatePlan(p);
 assert.equal(Object.keys(p.targets).length,17);
 for(const id of Object.keys(before))assert.deepEqual(p.targets[id],before[id]);
 assert.ok(Math.abs(p.targets['D.C3'].geometry.native.u-1069/1763)<1e-12);
 assert.ok(Math.abs(p.targets['D.C3'].geometry.native.v-(1-926/1173))<1e-12);
 p.targets['D.C3'].geometry.native.u=.62;
 const saved=structuredClone(p.targets['D.C3']);validatePlan(p);assert.deepEqual(p.targets['D.C3'],saved);
 const bad=structuredClone(p);bad.targets['D.C3'].geometry.native.u=2;assert.throws(()=>validatePlan(bad));
});

test('saved table projection is optional for legacy files and rejects unsupported settings',async()=>{
 const plan=defaultPlan();assert.deepEqual(plan.tableProjection,{mode:'flat',heading:0});
 const legacy=structuredClone(plan);delete legacy.tableProjection;validatePlan(legacy);
 for(const projection of [{mode:'spherical',heading:0},{mode:'flat',heading:22},{mode:'flat',heading:0,extra:true},null]){
  assert.throws(()=>validatePlan({...plan,tableProjection:projection}));
 }
});
test('rotated silhouettes are constrained in pixel space, not stretched normalized angles',()=>{
 const g={u:.99,v:.01,width:.12,height:.08,angle:70,taper:1.4};const c=constrain(g,'native');const q=quad(c,'native');
 assert.ok(q.every(p=>p.x>=0&&p.y>=0&&p.x<=1761+.00001&&p.y<=1173+.00001));
 const unrotated=quad({...g,u:.5,v:.5,angle:0,taper:1},'native'),rotated=quad({...g,u:.5,v:.5,angle:90,taper:1},'native');
 assert.ok(Math.abs(Math.abs(unrotated[1].x-unrotated[0].x)-Math.abs(rotated[1].y-rotated[0].y))<1e-9);
});
test('one flat plane preserves P4 corners and all image centres without changing a plan',()=>{
 const plan=defaultPlan(),before=JSON.stringify(plan);
 for(const view of ['native','portrait'] as const){
  const reference=plan.targets['P4.C1'].geometry[view],original=quad(reference,view),same=flatQuad(reference,reference,view);
  original.forEach((p,i)=>assert.ok(Math.hypot(p.x-same[i].x,p.y-same[i].y)<1e-6));
  for(const target of Object.values(plan.targets))for(const angle of [-90,-45,0,45,90]){
   const q=flatQuad(target.geometry[view],reference,view,angle),c=q.reduce((s,p)=>({x:s.x+p.x/4,y:s.y+p.y/4}),{x:0,y:0}),want=toPixels(target.geometry[view],view);
   assert.ok(q.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.ok(Math.hypot(c.x-want.x,c.y-want.y)<1e-6);
  }
  const a={...reference,u:.25},b={...reference,u:.75},qa=flatQuad(a,reference,view),qb=flatQuad(b,reference,view);
  // Same depth on the same plane: equal scale and horizontal edges, no fan rotation.
  assert.ok(Math.abs(qa[0].y-qa[1].y)<1e-6);assert.ok(Math.abs(qb[0].y-qb[1].y)<1e-6);
  assert.ok(Math.abs((qa[1].x-qa[0].x)-(qb[1].x-qb[0].x))<1e-6);
 }
 assert.equal(JSON.stringify(plan),before);
});
test('node map separates hand transfer from a real side turn',()=>{
 const intent:Intent={takeHand:'LH',startSide:'BACK',endSide:'FRONT',pass:true,turn:true,...INTENT_DEFAULTS};
 const nodes=motionNodes('P7.C1',intent);assert.deepEqual(nodes.map(n=>n.id),['ready','take','pass','turn','land','release','return']);assert.equal(nodes.find(n=>n.id==='release')?.detail,'RH');
 assert.ok(!motionNodes('D.C2',{...intent,endSide:'BACK',turn:false}).some(n=>n.id==='turn'));
});
test('invalid geometry, unknown fields and false side-change claims are rejected',()=>{
 for(const mutate of [(p:any)=>p.targets['P1.C1'].geometry.native.u=NaN,(p:any)=>p.targets['P1.C1'].geometry.native.width=3,(p:any)=>p.targets['P1.C1'].geometry.native.u=0,(p:any)=>p.targets['P1.C1'].intent.turn=false,(p:any)=>p.targets['P1.C1'].intent.takeHand=['LH'],(p:any)=>p.targets['P1.C1'].intent.startSide=['BACK'],(p:any)=>p.file='../outside.json']){const p=defaultPlan();mutate(p);assert.throws(()=>validatePlan(p));}
});
test('concurrent stale saves cannot overwrite another tab, and previous data is retained',async()=>{
 const base=path.resolve(tmpdir()),dir=await mkdtemp(path.join(base,'dealer-placement-test-'));assert.ok(path.resolve(dir).startsWith(base+path.sep));
 try{const store=placementStore(dir),initial=await store.load();const a=structuredClone(initial.plan),b=structuredClone(initial.plan);a.targets['P4.C2'].geometry.native.u=.6;b.targets['P4.C2'].geometry.native.u=.7;
  const results=await Promise.allSettled([store.save(a,initial.revision),store.save(b,initial.revision)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const rejected=results.find(r=>r.status==='rejected') as PromiseRejectedResult;assert.ok(rejected.reason instanceof StoreError);assert.equal(rejected.reason.status,409);
  const saved=await store.load();assert.equal(saved.plan.targets['P4.C2'].geometry.native.u,.6);assert.ok(saved.plan.updatedAt);assert.equal(JSON.parse(await readFile(path.join(dir,'.runtime/placement-previous.json'),'utf8')).targets['P4.C2'].geometry.native.u,initial.plan.targets['P4.C2'].geometry.native.u);
  await assert.rejects(store.save(a,undefined),(e:StoreError)=>e.status===428);
 }finally{assert.ok(path.resolve(dir).startsWith(base+path.sep+'dealer-placement-test-'));await rm(dir,{recursive:true,force:true});}
});

// A plan as it was saved before grip, turnAt and flipAxis existed.
const legacyPlan=()=>{const plan=defaultPlan() as any;for(const t of Object.values(plan.targets) as any[]){delete t.intent.grip;delete t.intent.turnAt;delete t.intent.flipAxis;}return plan;};
const INTENT_KEYS=['takeHand','startSide','endSide','pass','turn','grip','turnAt','flipAxis'];
test('plans saved before grip, turnAt and flipAxis load with their defaults, and the three keys validate strictly',()=>{
 const legacy=legacyPlan();validatePlan(legacy);
 for(const id of TARGETS){assert.deepEqual(Object.keys(legacy.targets[id].intent),INTENT_KEYS);assert.equal(legacy.targets[id].intent.grip,'PINCH');assert.equal(legacy.targets[id].intent.turnAt,'AIR');assert.equal(legacy.targets[id].intent.flipAxis,'FREE');}
 // One key present keeps its value; only the missing ones are filled.
 const partial=legacyPlan();partial.targets['P2.C1'].intent.grip='DRAG';validatePlan(partial);assert.equal(partial.targets['P2.C1'].intent.grip,'DRAG');assert.equal(partial.targets['P2.C1'].intent.turnAt,'AIR');
 // A plan saved with grip and turnAt but before flipAxis (placements/default.json today) gets only the axis, after the others.
 const before=defaultPlan() as any;for(const t of Object.values(before.targets) as any[])delete t.intent.flipAxis;before.targets['P4.C1'].intent.turnAt='PLACE';validatePlan(before);
 assert.deepEqual(Object.keys(before.targets['P4.C1'].intent),INTENT_KEYS);assert.deepEqual([before.targets['P4.C1'].intent.turnAt,before.targets['P4.C1'].intent.flipAxis],['PLACE','FREE']);
 const key=defaultPlan();key.targets['P5.C1'].intent.flipAxis='LONG_EDGE';validatePlan(key);assert.equal(key.targets['P5.C1'].intent.flipAxis,'LONG_EDGE');
 for(const mutate of [(i:any)=>i.grip='SLIDE',(i:any)=>i.grip=null,(i:any)=>i.grip=['DRAG'],(i:any)=>i.turnAt='FLOOR',(i:any)=>i.turnAt=true,(i:any)=>i.flipAxis='AT_PLACE',(i:any)=>i.flipAxis='SHORT_EDGE',(i:any)=>i.flipAxis=null,(i:any)=>i.speed=1]){const p=defaultPlan();mutate(p.targets['P3.C2'].intent);assert.throws(()=>validatePlan(p));}
 // A plan that fails is not half filled in.
 const broken=legacyPlan();broken.targets['D.C2'].geometry.native.u=NaN;assert.throws(()=>validatePlan(broken));assert.equal(Object.hasOwn(broken.targets['P1.C1'].intent,'grip'),false);
});
test('the tracked plan loads with the new keys filled in: the saved draft',async()=>{
 for(const file of ['placements/default.json']){
  const plan=JSON.parse(await readFile(file,'utf8'));validatePlan(plan);
  for(const id of TARGETS)assert.deepEqual(Object.keys(plan.targets[id].intent).slice(-3),['grip','turnAt','flipAxis'],`${file} ${id}`);
 }
});
// A plan as it was saved before 2026-11-26: with the shoe's point and a checked mark on every card, which the plan no longer keeps.
const withOldFields=()=>{const plan=defaultPlan() as any;plan.shoe={native:{u:.733,v:.322},portrait:{u:.84,v:.58}};for(const t of Object.values(plan.targets) as any[])for(const view of ['native','portrait'])t.geometry[view].reviewed=view==='native';return plan;};
const GEOMETRY_KEYS=['u','v','width','height','angle','taper'];
test('a plan saved with the shoe\'s point and checked marks loads without them, and the store writes neither',async()=>{
 const old=withOldFields();delete old.targets['D.C3'];const before=structuredClone(old);validatePlan(old);
 assert.equal(Object.hasOwn(old,'shoe'),false);
 for(const id of TARGETS)for(const view of ['native','portrait'] as const)assert.deepEqual(Object.keys(old.targets[id].geometry[view]),GEOMETRY_KEYS,`${id} ${view}`);
 assert.equal(old.targets['P5.C1'].geometry.native.u,before.targets['P5.C1'].geometry.native.u,'the places stay as they were');
 // only those two: any other unknown field is still refused, and a plan that fails keeps them (nothing half done)
 const extra=withOldFields();extra.targets['P1.C1'].geometry.native.checked=true;assert.throws(()=>validatePlan(extra));assert.equal(Object.hasOwn(extra,'shoe'),true);
 const base=path.resolve(tmpdir()),dir=await mkdtemp(path.join(base,'dealer-placement-test-'));assert.ok(path.resolve(dir).startsWith(base+path.sep));
 try{
  await mkdir(path.join(dir,'placements'));await writeFile(path.join(dir,'placements/default.json'),JSON.stringify(withOldFields(),null,2)+'\n');
  const store=placementStore(dir),read=await store.load();assert.equal(Object.hasOwn(read.plan,'shoe'),false);
  // a client that still sends them gets a file without them
  await store.save(withOldFields(),read.revision);const text=await readFile(path.join(dir,'placements/default.json'),'utf8');
  assert.doesNotMatch(text,/"shoe"|"reviewed"/);validatePlan(JSON.parse(text));
 }finally{assert.ok(path.resolve(dir).startsWith(base+path.sep+'dealer-placement-test-'));await rm(dir,{recursive:true,force:true});}
});
test('the store reads an older file with the defaults and writes the two keys when it saves',async()=>{
 const base=path.resolve(tmpdir()),dir=await mkdtemp(path.join(base,'dealer-placement-test-'));assert.ok(path.resolve(dir).startsWith(base+path.sep));
 try{
  await mkdir(path.join(dir,'placements'));await writeFile(path.join(dir,'placements/default.json'),JSON.stringify(legacyPlan(),null,2)+'\n');
  const store=placementStore(dir),read=await store.load();assert.equal(read.plan.targets['P5.C1'].intent.grip,'PINCH');assert.equal(read.plan.targets['P5.C1'].intent.turnAt,'AIR');
  // A client that still sends the older shape gets the keys written too.
  await store.save(legacyPlan(),read.revision);const text=await readFile(path.join(dir,'placements/default.json'),'utf8');
  assert.equal(text.match(/"grip": "PINCH"/g)?.length,17);assert.equal(text.match(/"turnAt": "AIR"/g)?.length,17);assert.equal(text.match(/"flipAxis": "FREE"/g)?.length,17);
 }finally{assert.ok(path.resolve(dir).startsWith(base+path.sep+'dealer-placement-test-'));await rm(dir,{recursive:true,force:true});}
});
test('the sequence and the node map show a dragged card and where the turn happens',()=>{
 const drag:Intent={takeHand:'LH',startSide:'BACK',endSide:'FRONT',pass:false,turn:true,grip:'DRAG',turnAt:'PLACE'};
 assert.equal(sequence('P2.C1',drag),'P2.C1 | DRAG(LH,BACK) > TURN(LH,BACK>FRONT,PLACE) > LAND(FRONT) > RELEASE(LH) > RETURN(SHOE_READY)');
 assert.equal(sequence('P2.C1',{...drag,grip:'PINCH',turnAt:'AIR'}),'P2.C1 | TAKE(LH,BACK) > TURN(LH,BACK>FRONT,AIR) > LAND(FRONT) > RELEASE(LH) > RETURN(SHOE_READY)');
 assert.match(sequence('P2.C1',{...drag,pass:true,turnAt:'AIR'}),/^P2\.C1 \| DRAG\(LH,BACK\) > PASS\(LH>RH,BACK\) > TURN\(RH,BACK>FRONT,AIR\) > LAND\(FRONT\) > RELEASE\(RH\)/);
 // Laid closed and turned later: no TURN at all, whatever the place of a turn says.
 assert.equal(sequence('D.C2',{...drag,endSide:'BACK',turn:false}),'D.C2 | DRAG(LH,BACK) > LAND(BACK) > RELEASE(LH) > RETURN(SHOE_READY)');
 const nodes=motionNodes('P2.C1',drag);assert.equal(nodes.find(n=>n.id==='take')?.label,'DRAG');assert.equal(nodes.find(n=>n.id==='turn')?.detail,'BACK → FRONT · PLACE');
 assert.equal(motionNodes('P2.C1',{...drag,grip:'PINCH'}).find(n=>n.id==='take')?.label,'TAKE');
});

test('the yellow card painted in the shoe window, and the window card of the films, lie in the picture as standing cards',()=>{
 for(const [view,q] of [['native',SHOE_CARD.native],['portrait',SHOE_CARD.portrait],['native',WINDOW_CARD.native],['portrait',WINDOW_CARD.portrait]] as const){
  const p=VIEWS[view],s=q.reduce((m,c)=>({x:m.x+c.x/4,y:m.y+c.y/4}),{x:0,y:0});assert.equal(q.length,4);
  for(const c of q)assert.ok(c.x>0&&c.y>0&&c.x<p.width-1&&c.y<p.height-1);
  // clockwise in picture coordinates (y down) and convex: the card's own middle on the inner side of every edge
  for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];assert.ok((b.x-a.x)*(s.y-a.y)-(b.y-a.y)*(s.x-a.x)>0,`${view} edge ${i}`);}
  // a standing card: about twice as long as it is wide in the picture
  const side=(i:number)=>Math.hypot(q[(i+1)%4].x-q[i].x,q[(i+1)%4].y-q[i].y);assert.ok(side(1)/side(0)>1.6&&side(1)/side(0)<2.6);
 }
 // the films' window card is the V6 picture's card: the same angle (within 3°), the same length (within 5 %) and every corner
 // within 6 px. It is the card standing in the window, never the pinched card drawn up out of it (111 px long), which would
 // lie outside the shoe's mouth.
 const axis=(q:readonly {x:number;y:number}[])=>{const a={x:(q[0].x+q[1].x)/2,y:(q[0].y+q[1].y)/2},b={x:(q[2].x+q[3].x)/2,y:(q[2].y+q[3].y)/2};return {angle:Math.atan2(a.y-b.y,a.x-b.x)*180/Math.PI,length:Math.hypot(a.x-b.x,a.y-b.y)};};
 const film=axis(WINDOW_CARD.native),v6=axis(SHOE_CARD.native);
 assert.ok(Math.abs(film.angle-v6.angle)<3&&Math.abs(film.length/v6.length-1)<.05,`${film.angle.toFixed(1)}° ${film.length.toFixed(0)} px against ${v6.angle.toFixed(1)}° ${v6.length.toFixed(0)} px`);
 WINDOW_CARD.native.forEach((c,i)=>assert.ok(Math.hypot(c.x-SHOE_CARD.native[i].x,c.y-SHOE_CARD.native[i].y)<6,`corner ${i}`));
 assert.ok(film.length<100,'the card in the window, not the pinched card');
});

// ── The plan's edits shared by Bordet's Inspelning (planQuad, editPlace, editIntent, …) ──
test('planQuad draws a card as the game lays it: flat from P4.C1 on a flat table, card by card otherwise or without a projection',async()=>{
 const m=await import('../src/placement-model.ts'),plan=defaultPlan();plan.targets['P2.C1'].geometry.native.angle=30;
 for(const view of ['native','portrait'] as const){
  assert.deepEqual(m.planQuad(plan,'P2.C1',view),flatQuad(plan.targets['P2.C1'].geometry[view],plan.targets['P4.C1'].geometry[view],view,0));
  const tilted={...plan,tableProjection:{mode:'flat' as const,heading:45}};assert.deepEqual(m.planQuad(tilted,'P2.C1',view),flatQuad(plan.targets['P2.C1'].geometry[view],plan.targets['P4.C1'].geometry[view],view,45));
  const own={...plan,tableProjection:{mode:'individual' as const,heading:0}};assert.deepEqual(m.planQuad(own,'P2.C1',view),quad(plan.targets['P2.C1'].geometry[view],view));
  const legacy=structuredClone(plan);delete legacy.tableProjection;assert.deepEqual(m.planQuad(legacy,'P2.C1',view),quad(plan.targets['P2.C1'].geometry[view],view));
 }
 assert.throws(()=>m.planQuad(plan,'P9.C1','native'),/Okänd kortplats/);
});
test('editPlace moves, turns and sizes a place by the plan\'s rules and leaves the given plan alone',async()=>{
 const m=await import('../src/placement-model.ts'),plan=defaultPlan();const before=structuredClone(plan);
 // a move changes that view only; the other view and the given plan are untouched
 const moved=m.editPlace(plan,'P4.C1','native',{u:.4,v:.3});assert.deepEqual(plan,before);validatePlan(moved);
 assert.equal(moved.targets['P4.C1'].geometry.native.u,.4);assert.deepEqual(moved.targets['P4.C1'].geometry.portrait,plan.targets['P4.C1'].geometry.portrait);
 // limits: size .005–.25, taper .4–1.6, angle wrapped into −180…180, and the outline kept inside the picture
 const wild=m.editPlace(plan,'P1.C1','native',{width:.9,height:.001,taper:3,angle:190,u:-1});const g=wild.targets['P1.C1'].geometry.native;validatePlan(wild);
 assert.equal(g.width,.25);assert.equal(g.height,.005);assert.equal(g.taper,1.6);assert.equal(g.angle,-170);assert.ok(g.u>0);
 assert.equal(m.editPlace(plan,'P1.C1','native',{angle:-190}).targets['P1.C1'].geometry.native.angle,170);
 assert.equal(m.editPlace(plan,'P1.C1','native',{angle:180}).targets['P1.C1'].geometry.native.angle,180);
 // the shoe is no place of the plan, nor any other word
 for(const id of ['P8.C1','shoe'])assert.throws(()=>m.editPlace(plan,id,'native',{u:.5}),/Okänd kortplats/);
});
test('editIntent keeps TURN and the two sides in agreement',async()=>{
 const m=await import('../src/placement-model.ts'),plan=defaultPlan();
 const closed=m.editIntent(plan,'P1.C1','endSide','BACK');assert.equal(closed.targets['P1.C1'].intent.turn,false);assert.equal(plan.targets['P1.C1'].intent.endSide,'FRONT');validatePlan(closed);
 const turned=m.editIntent(closed,'P1.C1','turn',true);assert.equal(turned.targets['P1.C1'].intent.endSide,'FRONT');validatePlan(turned);
 const open=m.editIntent(plan,'P1.C1','startSide','FRONT');assert.equal(open.targets['P1.C1'].intent.turn,false);validatePlan(open);
 const passed=m.editIntent(plan,'P1.C1','pass',true);assert.equal(passed.targets['P1.C1'].intent.pass,true);assert.equal(passed.targets['P1.C1'].intent.endSide,'FRONT');
});
