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
async function until(expression){for(let n=0;n<100;n++){if(await ev(expression))return;await sleep(100)}throw Error('Timed out: '+expression)}
try{
 await call('Page.enable');await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await sleep(1200);await until(`!!globalThis.game?.ready&&!!globalThis.canvas?.ready`);
 await ev(`game.modules.get('crooked-moon-landing-page').api.openCast().then(()=>true)`);await wait('[data-cm-configure]');await click('[data-cm-configure]');await wait('[data-cm-roster-rows]');
 check('permissions sharing is opt-in',await ev(`!document.querySelector('[name="shareActors"]').checked`));
 await ev(`document.querySelector('[data-cm-add-row]').click()`);check('add roster slot works',await ev(`document.querySelectorAll('.cm-cast-config-row').length===7`));
 await ev(`document.querySelectorAll('[data-cm-remove-row]')[6].click()`);check('remove roster slot works',await ev(`document.querySelectorAll('.cm-cast-config-row').length===6`));
 await ev(`(()=>{const c=document.querySelector('[name="useAssigned"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 check('automatic mode shows assigned roster rather than stale manual rows',await ev(`[...document.querySelectorAll('[name="actorId"]')].every(e=>e.disabled)&&document.querySelectorAll('.cm-cast-config-row').length===1`));
 await ev(`(()=>{const c=document.querySelector('[name="useAssigned"]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 check('manual draft restored when switching back',await ev(`document.querySelectorAll('.cm-cast-config-row').length===6&&document.querySelector('[name="actorId"]').value!==''`));
 const original=await ev(`(()=>{const row=document.querySelector('.cm-cast-config-row');return{actor:row.querySelector('[name="actorId"]').value,pronouns:row.querySelector('[name="pcPronouns"]').value}})()`);
 await ev(`document.querySelector('[name="pcPronouns"]').value='they/he'`);await click('button[data-action="save"]');await until(`document.querySelector('[data-cm-actor="${original.actor}"] .cm-cast-pronouns')?.textContent==='they/he'`);
 check('saving native dialog updates actor-backed PC pronouns live',await ev(`game.actors.get('${original.actor}').getFlag('crooked-moon-landing-page','pronouns')==='they/he'`));
 await ev(`game.actors.get('${original.actor}').setFlag('crooked-moon-landing-page','pronouns',${JSON.stringify(original.pronouns)}).then(()=>true)`);
 check('no runtime exceptions',errors.length===0,errors);console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.passed)}));
}catch(e){checks.push({name:'Cast configuration UI',passed:false,error:String(e)});console.error(e)}
fs.writeFileSync(path.join(output,'configuration-results.json'),JSON.stringify({checks,errors},null,2));ws.close();process.exitCode=checks.some(c=>!c.passed)?1:0;
