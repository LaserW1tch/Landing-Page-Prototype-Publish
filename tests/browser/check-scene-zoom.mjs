import fs from 'node:fs'
import path from 'node:path'
const output=process.argv[2]
if(!output)throw Error('Supply a new evidence directory')
fs.mkdirSync(output,{recursive:true})
const targets=await(await fetch('http://127.0.0.1:9245/json/list')).json()
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j})
let id=0
const pending=new Map(),checks=[],errors=[]
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)}
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value}
const check=(name,passed,detail)=>{checks.push({name,passed:!!passed,detail});if(!passed)throw Error(name)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const wait=async selector=>{for(let n=0;n<100;n++){if(await ev(`!!document.querySelector(${JSON.stringify(selector)})`))return;await sleep(100)}throw Error('Missing '+selector)}
const click=async selector=>{await wait(selector);await ev(`document.querySelector(${JSON.stringify(selector)}).click()`)}
try{
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 await sleep(1500);
 if(await ev(`!!document.querySelector('#join-game-form')`)){await ev(`document.querySelector('#join-username').value='Gamemaster';document.querySelector('#join-game-form').requestSubmit()`);await sleep(1000)}
 for(let n=0;n<180;n++){try{if(await ev(`globalThis.game?.ready&&globalThis.canvas?.ready`))break}catch{}await sleep(200)}
 check('authorized testbed is running',await ev(`game.world.id==='testbed'&&game.version==='14.367'`));
 // Hard reload ensures the patched module/CSS is used without restarting the server.
 await call('Page.reload',{ignoreCache:true});await sleep(1200);
 for(let n=0;n<180;n++){try{if(await ev(`globalThis.game?.ready&&globalThis.canvas?.ready`))break}catch{}await sleep(200)}
 await ev(`(async()=>{const id='crooked-moon-landing-page';const s=game.scenes.find(s=>s.getFlag(id,'landing'));if(canvas.scene?.id!==s.id)await s.view();await game.modules.get(id).api.refresh();return true})()`);await wait('#crooked-moon-landing .cm-link');await ev(`document.fonts.ready`);
 const state=()=>ev(`(()=>{const root=document.querySelector('#crooked-moon-landing');const r=root.getBoundingClientRect();const sr=canvas.dimensions.sceneRect;const b=canvas.app.view.getBoundingClientRect();const origin=canvas.stage.toGlobal({x:sr.x,y:sr.y});const far=canvas.stage.toGlobal({x:sr.right,y:sr.bottom});const sx=b.width/canvas.app.screen.width,sy=b.height/canvas.app.screen.height;return {scale:canvas.stage.scale.x,width:r.width,height:r.height,left:r.left,top:r.top,expected:{left:b.left+origin.x*sx,top:b.top+origin.y*sy,width:(far.x-origin.x)*sx,height:(far.y-origin.y)*sy},title:root.querySelector('h1').getBoundingClientRect().width,buttons:[...root.querySelectorAll('.cm-link')].map(b=>b.getBoundingClientRect().width),layoutWidth:root.clientWidth}})()`);
 const aligned=s=>['left','top','width','height'].every(k=>Math.abs(s[k]-s.expected[k])<.1);
 let prior;
 for(const scale of [.45,.8,1.25]){
  await ev(`canvas.pan({x:960,y:600,scale:${scale}});true`);await sleep(100);const s=await state();check('scene alignment at zoom '+scale,aligned(s)&&s.layoutWidth===1920,s);
  if(prior)check('all buttons and title scale proportionally at '+scale,s.buttons.every((w,i)=>Math.abs(w/prior.buttons[i]-s.scale/prior.scale)<.001)&&Math.abs(s.title/prior.title-s.scale/prior.scale)<.001,{before:prior.scale,after:s.scale});prior=s;
 }
 await ev(`canvas.pan({x:800,y:700,scale:.8});true`);check('panning keeps overlay registered to background',aligned(await state()),await state());
 await ev(`canvas.pan({x:960,y:600,scale:.8});true`);
 let before=await state();await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:800,y:450,deltaX:0,deltaY:120});await sleep(150);let after=await state();check('real wheel over village zooms both layers',after.scale<before.scale&&aligned(after),{before,after});
 const point=await ev(`(()=>{const r=document.querySelector('[data-cm-destination="details"]').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
 before=await state();await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:point.x,y:point.y,deltaX:0,deltaY:-120});await sleep(150);after=await state();check('real wheel over button zooms once with background',Math.abs(after.scale/before.scale-1.05)<.001&&aligned(after),{before:before.scale,after:after.scale});
 await ev(`canvas.animatePan({x:1050,y:550,scale:.7,duration:350}).then(()=>true)`);check('animated camera movement remains aligned',aligned(await state()),await state());
 await ev(`canvas.pan({x:960,y:600,scale:.75});true`);await click('[data-cm-destination="story"]');
 for(let n=0;n<80;n++){if(await ev(`game.journal.find(j=>j.getFlag('crooked-moon-landing-page','destination')==='story').sheet.rendered`))break;await sleep(100)}
 check('journal link still works after zoom',await ev(`game.journal.find(j=>j.getFlag('crooked-moon-landing-page','destination')==='story').sheet.rendered`));
 await ev(`(async()=>{await game.journal.find(j=>j.getFlag('crooked-moon-landing-page','destination')==='story').sheet.close();return true})()`);
 for(const dpr of [1,2]){
  await call('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:dpr,mobile:false});await sleep(250);check('resized DPR'+dpr+' scene remains registered',aligned(await state()),await state());
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});await sleep(250);
 for(const [label,scale] of [['zoom-out',.5],['normal',.8333333333],['zoom-in',1.1]]){await ev(`canvas.pan({x:960,y:600,scale:${scale}});true`);await sleep(100);const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,label+'.png'),Buffer.from(shot.data,'base64'))}
 await ev(`canvas.pan({x:960,y:600,scale:5/6});true`);
 check('no module runtime exceptions',errors.length===0,errors);
 console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.passed)}));
}catch(e){checks.push({name:'zoom/pan integration',passed:false,error:String(e)});console.error(e)}
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2));ws.close();process.exitCode=checks.some(c=>!c.passed)?1:0;
