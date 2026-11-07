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
 const permissions=await ev(`(()=>{const observer=new User({_id:foundry.utils.randomID(),name:'Unsaved permission probe',role:CONST.USER_ROLES.PLAYER});return game.journal.filter(j=>j.getFlag('crooked-moon-landing-page','destination')).map(j=>({name:j.name,read:j.testUserPermission(observer,'OBSERVER'),owner:j.testUserPermission(observer,'OWNER')}))})()`);
 check('ordinary player can read all five native journals',permissions.length===5&&permissions.every(p=>p.read&&!p.owner),permissions);
 await ev(`(()=>{const menu=game.settings.menus.get('crooked-moon-landing-page.setup');new menu.type().render();return true})()`);
 await wait('button[data-action="no"]');check('native setup menu opens GM confirmation',await ev(`document.body.innerText.includes('Create / Repair Landing')`));
 await click('button[data-action="no"]');await sleep(200);
 check('cancel setup keeps one scene and five journals',await ev(`game.scenes.filter(s=>s.getFlag('crooked-moon-landing-page','landing')).length===1&&game.journal.filter(j=>j.getFlag('crooked-moon-landing-page','destination')).length===5`));
 // Verify navigation cleans up without modifying a different existing scene.
 const switchResult=await ev(`(async()=>{const id='crooked-moon-landing-page';const landing=canvas.scene;const other=game.scenes.find(s=>!s.getFlag(id,'landing'));if(!other)return null;await other.view();return {other:other.id,landing:landing.id}})()`);
 if(switchResult){for(let n=0;n<100;n++){if(await ev(`canvas.ready&&canvas.scene.id===${JSON.stringify(switchResult.other)}`))break;await sleep(100)}check('other scenes have no campaign overlay or pause override',await ev(`!document.getElementById('crooked-moon-landing')&&!document.body.classList.contains('cm-landing-active')`));await ev(`(async()=>{await game.scenes.get(${JSON.stringify(switchResult.landing)}).view();return true})()`);await wait('#crooked-moon-landing');check('returning to landing restores navigation',await ev(`!!document.getElementById('crooked-moon-landing')`));}
 console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.passed),errors}));
}catch(e){checks.push({name:'permission/menu/lifecycle verification',passed:false,error:String(e)});console.error(e)}
fs.writeFileSync(path.join(output,'foundry-permissions-results.json'),JSON.stringify({checks,errors},null,2));ws.close();process.exitCode=checks.some(c=>!c.passed)?1:0;
