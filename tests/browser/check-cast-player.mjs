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
let browserContext, playerSocket, browserSession;const restoration=[];
async function connect(url){const socket=new WebSocket(url);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});let id=0;const requests=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=requests.get(m.id);requests.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}};const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;requests.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}))});const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value};return{socket,send,evaluate}}
try{
 const fixture=await ev(`(()=>{if(game.world.id!=='testbed'||!game.user.isGM)throw Error('Wrong world/user');const a=game.actors.find(a=>a.getFlag('crooked-moon-landing-page','castDemoKey')===0);const u=game.users.find(u=>u.getFlag('crooked-moon-landing-page','castDemo'));return{actor:a.id,player:u.name,ac:a._source.system.attributes.ac.flat,ownership:a.ownership.default}})()`);
 restoration.push(`game.actors.get('${fixture.actor}').update({'system.attributes.ac.flat':${fixture.ac},'ownership.default':${fixture.ownership}}).then(()=>true)`);
 const version=await(await fetch('http://127.0.0.1:9245/json/version')).json();browserSession=await connect(version.webSocketDebuggerUrl);const created=await browserSession.send('Target.createBrowserContext');browserContext=created.browserContextId;const target=await browserSession.send('Target.createTarget',{url:'http://localhost:30000/join',browserContextId:browserContext});
 const targets=await(await fetch('http://127.0.0.1:9245/json/list')).json();const info=targets.find(t=>t.id===target.targetId);const pc=await connect(info.webSocketDebuggerUrl);playerSocket=pc.socket;
 await pc.send('Page.enable');await pc.send('Runtime.enable');await pc.send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 const pev=pc.evaluate;async function playerUntil(expr){for(let n=0;n<180;n++){try{if(await pev(expr))return}catch{}await sleep(100)}throw Error('Player wait: '+expr)}
 await playerUntil(`!!document.querySelector('#join-username')`);await pev(`document.querySelector('#join-username').value=${JSON.stringify(fixture.player)};document.querySelector('#join-game-form').requestSubmit()`);
 await playerUntil(`!!globalThis.game?.ready&&!!globalThis.canvas?.ready&&!!game.modules.get('crooked-moon-landing-page')?.api?.openCast`);
 check('separate client logged in as non-GM player',await pev(`!game.user.isGM&&game.world.id==='testbed'`));
 await pev(`game.modules.get('crooked-moon-landing-page').api.openCast().then(()=>true)`);await playerUntil(`document.querySelectorAll('.cm-cast-entry').length===6`);
 check('player sees six permitted PCs and no GM management button',await pev(`document.querySelectorAll('[data-cm-actor]').length===6&&!document.querySelector('[data-cm-configure]')`));
 await ev(`game.actors.get('${fixture.actor}').update({'system.attributes.ac.flat':23}).then(()=>true)`);
 await playerUntil(`document.querySelector('[data-cm-actor="${fixture.actor}"] [data-cm-stat="ac"] dd').textContent==='23'`);
 check('GM actor change updates already-open player Cast without reload',await pev(`document.querySelector('[data-cm-actor="${fixture.actor}"] [data-cm-stat="ac"] dd').textContent===String(game.actors.get('${fixture.actor}').system.attributes.ac.value)`));
 await ev(`game.actors.get('${fixture.actor}').update({'ownership.default':0}).then(()=>true)`);await playerUntil(`document.querySelectorAll('[data-cm-actor]').length===5`);
 check('withdrawing permission removes private stats from player view live',await pev(`!document.querySelector('[data-cm-actor="${fixture.actor}"]')&&!!document.querySelector('.cm-cast-unavailable')`));
 await ev(restoration[0]);await playerUntil(`document.querySelectorAll('[data-cm-actor]').length===6`);
 check('restoring Observer permission restores live panel',await pev(`document.querySelector('[data-cm-actor="${fixture.actor}"] [data-cm-stat="ac"] dd').textContent===${JSON.stringify(String(fixture.ac))}`));restoration.length=0;
 const denied=await pev(`(async()=>{try{await game.modules.get('crooked-moon-landing-page').api.configureCast();return false}catch(e){return e.message.includes('Game Master')}})()`);check('player cannot invoke GM cast configuration API',denied);
 await pev(`(async()=>{for(const app of foundry.applications.instances.values()){if(app.document?.documentName==='User')await app.close()}document.querySelector('[data-cm-back]').click();return true})()`);await playerUntil(`!!document.querySelector('[data-cm-destination="cast"]')`);const point=await pev(`(()=>{const r=document.querySelector('[data-cm-destination="cast"]').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);await pc.send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});await pc.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});await playerUntil(`document.querySelectorAll('.cm-cast-entry').length===6`);check('player can open Cast through the actual landing button',true);await pev(`document.fonts.ready`);const shot=await pc.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,'cast-player.png'),Buffer.from(shot.data,'base64'));
 console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.passed)}));
}catch(e){checks.push({name:'separate-player live Cast verification',passed:false,error:String(e)});console.error(e)}
finally{for(const expr of restoration){try{await ev(expr)}catch(e){checks.push({name:'restore demo record',passed:false,error:String(e)})}}if(browserContext)await browserSession.send('Target.disposeBrowserContext',{browserContextId:browserContext});playerSocket?.close();browserSession?.socket.close();fs.writeFileSync(path.join(output,'player-results.json'),JSON.stringify({checks,errors},null,2));ws.close();process.exitCode=checks.some(c=>!c.passed)?1:0;}
