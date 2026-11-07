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
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});await call('Page.reload',{ignoreCache:true});await sleep(1200);
 for(let n=0;n<180;n++){try{if(await ev(`globalThis.game?.ready&&globalThis.canvas?.ready`))break}catch{}await sleep(200)}
 check('local testbed ready',await ev(`game.world.id==='testbed'&&game.version==='14.367'`));
 await ev(`game.modules.get('crooked-moon-landing-page').api.refresh().then(()=>true)`);await wait('#crooked-moon-landing');await ev(`document.fonts.load('126px "CM Gothic"')`);await ev(`document.fonts.ready`);
 check('supplied Crimson Ritual loads as heading font',await ev(`document.fonts.check('126px "CM Gothic"')&&performance.getEntriesByType('resource').some(r=>r.name.includes('/assets/fonts/CrimsonRitual.ttf'))`));
 check('all four rejected text elements removed',await ev(`!document.querySelector('#crooked-moon-landing .cm-kicker, #crooked-moon-landing .cm-invitation, #crooked-moon-landing .cm-nav-heading, #crooked-moon-landing .cm-footer')`));
 check('five destinations preserved',await ev(`document.querySelectorAll('#crooked-moon-landing .cm-link').length===5`));
 await ev(`canvas.pan({x:960,y:600,scale:5/6});true`);await sleep(250);
 const layout=await ev(`(()=>{const root=document.querySelector('#crooked-moon-landing');const h=root.querySelector('h1');return {titleFits:h.scrollWidth<=h.clientWidth,buttons:[...root.querySelectorAll('.cm-link')].map(b=>{const text=b.querySelector('.cm-link-title').getBoundingClientRect(),open=b.querySelector('.cm-link-open').getBoundingClientRect(),card=b.getBoundingClientRect();return{key:b.dataset.cmDestination,textFits:text.left>=card.left&&text.right<=card.right&&text.bottom<open.top}})}})()`);
 check('Crimson Ritual headings fit their title and cards',layout.titleFits&&layout.buttons.every(b=>b.textFits),layout);
 const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,'crimson-ritual-foundry.png'),Buffer.from(shot.data,'base64'));
 await ev(`canvas.pan({x:960,y:600,scale:.5});true`);await sleep(100);const state=await ev(`(()=>{const r=document.querySelector('#crooked-moon-landing').getBoundingClientRect();return{width:r.width,scale:canvas.stage.scale.x}})()`);check('new typography still scales with scene',Math.abs(state.width-1920*state.scale)<.1,state);
 await ev(`canvas.pan({x:960,y:600,scale:5/6});true`);
 check('no runtime exceptions',errors.length===0,errors);console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.passed)}));
}catch(e){checks.push({name:'Crimson Ritual native check',passed:false,error:String(e)});console.error(e)}
fs.writeFileSync(path.join(output,'crimson-font-results.json'),JSON.stringify({checks,errors},null,2));ws.close();process.exitCode=checks.some(c=>!c.passed)?1:0;
