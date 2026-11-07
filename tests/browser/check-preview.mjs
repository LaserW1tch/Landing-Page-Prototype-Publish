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
 await call('Page.enable');await call('Runtime.enable')
 await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false})
 await call('Page.navigate',{url:'http://localhost:5174/preview.html'});await wait('.cm-link')
 await ev(`document.fonts.ready`);await ev(`document.querySelector('.cm-preview-bg').decode()`)
 const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,'landing-desktop.png'),Buffer.from(shot.data,'base64'))
 check('five requested links',await ev(`document.querySelectorAll('[data-cm-destination]').length===5`))
 for(const key of ['story','cast','details','graveyard','rules']){await click(`[data-cm-destination="${key}"]`);check(key+' opens destination',await ev(`document.querySelector('dialog').open`));await click('dialog button')}
 check('fonts loaded',await ev(`document.fonts.check('20px "CM Gothic"')&&document.fonts.check('20px "CM Serif"')`))
 for(const [width,height] of [[1366,768],[800,900],[390,844]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(100)
  const layout=await ev(`({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.cm-link')].map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,textFits:b.scrollHeight<=b.clientHeight}})})`)
  check(width+' navigation fits',!layout.overflow&&layout.buttons.every(b=>b.left>=0&&b.right<=width&&b.top>=0&&b.bottom<=height&&b.textFits),layout)
  const pic=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,'landing-'+width+'.png'),Buffer.from(pic.data,'base64'))
 }
}catch(e){checks.push({name:'browser verification',passed:false,error:String(e)})}
fs.writeFileSync(path.join(output,'preview-results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.passed)}));ws.close();
