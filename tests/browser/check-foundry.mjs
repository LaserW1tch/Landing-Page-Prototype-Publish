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
 await call('Page.reload',{ignoreCache:true});await sleep(1200);for(let i=0;i<120;i++){try{if(await ev(`globalThis.game?.ready&&!!game.modules.get('crooked-moon-landing-page')?.api`))break}catch{}await sleep(300)}
 const setup=await ev(`(async()=>{if(game.world.id!=='testbed')throw Error('Wrong world');const r=await game.modules.get('crooked-moon-landing-page').api.install({view:false});return {scene:r.scene.id,journals:r.journals,grid:r.scene.grid.type,background:r.scene.levels.contents[0].background.src,width:r.scene.width,height:r.scene.height,fog:r.scene.fog.mode}})()`);
 check('native V14 scene created at supplied image dimensions',setup.width===1920&&setup.height===1200&&setup.grid===0&&setup.background.endsWith('moonlit-village.png'),setup);
 check('five journal destinations created',Object.keys(setup.journals).length===5,setup.journals);
 const repeat=await ev(`(async()=>{const id='crooked-moon-landing-page';await game.modules.get(id).api.install({view:false});return {scenes:game.scenes.filter(s=>s.getFlag(id,'landing')).length,journals:game.journal.filter(j=>j.getFlag(id,'destination')).map(j=>({name:j.name,ownership:j.ownership.default,pages:j.pages.size}))}})()`);
 check('repeat native setup does not duplicate scene or journals',repeat.scenes===1&&repeat.journals.length===5,repeat);
 check('all native journals are player-readable',repeat.journals.every(j=>j.ownership===2&&j.pages===1),repeat);
 await ev(`(async()=>{const s=game.scenes.get(${JSON.stringify(setup.scene)});if(!s.active)await s.activate();else await s.view()})()`);await wait('#crooked-moon-landing .cm-link');await ev(`document.fonts.ready`);await sleep(6000);
 check('pause graphic hidden while world pause retained',await ev(`getComputedStyle(document.querySelector('#pause')).display==='none'&&game.paused`));
 check('live scene displays five navigation cards',await ev(`document.querySelectorAll('#crooked-moon-landing [data-cm-destination]').length===5`));
 for(const [key,uuid] of Object.entries(setup.journals)){
  if(key==='cast'){await click('[data-cm-destination="cast"]');await wait('.cm-cast-body');check('cast opens live actor-backed view',await ev(`!!document.querySelector('.cm-cast-body')`));await click('[data-cm-back]');continue;}
  await click(`[data-cm-destination="${key}"]`);for(let n=0;n<60;n++){if(await ev(`(async()=>{const j=await fromUuid(${JSON.stringify(uuid)});return j.sheet.rendered})()`))break;await sleep(100)}
  check(key+' opens real Foundry journal sheet',await ev(`(async()=>{const j=await fromUuid(${JSON.stringify(uuid)});return j.sheet.rendered})()`));
  await ev(`(async()=>{const j=await fromUuid(${JSON.stringify(uuid)});await j.sheet.close()})()`);
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});await sleep(500);const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,'foundry-gm-1600.png'),Buffer.from(shot.data,'base64'));
 for(const [width,height] of [[1366,768],[1024,768]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(250);
  const state=await ev(`({buttons:[...document.querySelectorAll('#crooked-moon-landing .cm-link')].map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,textFits:b.scrollHeight<=b.clientHeight}})})`);
  check(width+' native viewport navigation fits',state.buttons.every(b=>b.left>=0&&b.right<=width&&b.bottom<=height&&b.textFits),state);
  const pic=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,'foundry-gm-'+width+'.png'),Buffer.from(pic.data,'base64'));
 }
 await ev(`game.settings.set('crooked-moon-landing-page','showNavigation',false)`);await sleep(150);check('client setting hides navigation',await ev(`!document.getElementById('crooked-moon-landing')`));
 await ev(`game.settings.set('crooked-moon-landing-page','showNavigation',true)`);await wait('#crooked-moon-landing');check('client setting restores navigation',await ev(`!!document.getElementById('crooked-moon-landing')`));
 console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.passed),errors}));
}catch(e){checks.push({name:'native Foundry integration run',passed:false,error:String(e)});console.error(String(e));}
fs.writeFileSync(path.join(output,'foundry-results.json'),JSON.stringify({checks,errors},null,2));ws.close();process.exitCode=checks.some(c=>!c.passed)?1:0;
