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
async function until(expression){for(let i=0;i<100;i++){if(await ev(expression))return;await sleep(100)}throw Error('Timed out: '+expression)}
try{
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});await sleep(1200);
 if(await ev(`!!document.querySelector('#join-game-form')`)){await ev(`document.querySelector('#join-username').value='Gamemaster';document.querySelector('#join-game-form').requestSubmit()`);await sleep(1200)}
 await until(`!!globalThis.game?.ready&&!!globalThis.canvas?.ready`);
 check('authorized testbed',await ev(`game.world.id==='testbed'&&game.user.isGM`));
 await call('Page.reload',{ignoreCache:true});await sleep(1200);await until(`!!globalThis.game?.ready&&!!globalThis.canvas?.ready&&!!game.modules.get('crooked-moon-landing-page')?.api?.openCast`);
 const fixture=await ev(`(async()=>{
  const id='crooked-moon-landing-page';
  let folder=game.folders.find(f=>f.type==='Actor'&&f.getFlag(id,'castDemo'));if(!folder)folder=await Folder.create({name:'Crooked Moon — Cast Demo',type:'Actor',flags:{[id]:{castDemo:true}}});
  let player=game.users.find(u=>u.getFlag(id,'castDemo'));if(!player)player=await User.create({name:'Cast Demo Player',role:CONST.USER_ROLES.PLAYER,pronouns:'they/them',flags:{[id]:{castDemo:true}}});
  const specs=[['Mara [Demo]','ClericHuman.webp','Cleric','Grave Domain','she/her','wis'],['Rowan [Demo]','RangerBow.webp','Ranger','Gloom Stalker','they/them','wis'],['Elian [Demo]','WizardTome.webp','Wizard','Divination','he/him','int'],['Vesper [Demo]','WarlockStaff.webp','Warlock','The Archfey','she/they','cha'],['Briar [Demo]','DruidStaff.webp','Druid','Circle of the Moon','they/them','wis'],['Silas [Demo]','RogueHuman.webp','Rogue','Thief','he/they','']];
  const actors=[];
  for(let n=0;n<specs.length;n++){
   const [name,art,cls,subclass,pronouns,ability]=specs[n];let actor=game.actors.find(a=>a.getFlag(id,'castDemoKey')===n);
   if(!actor)actor=await Actor.create({name,type:'character',img:'systems/dnd5e/tokens/heroes/'+art,folder:folder.id,ownership:{default:2},flags:{[id]:{castDemoKey:n,pronouns}},system:{abilities:{str:{value:12},dex:{value:14},con:{value:14},int:{value:16},wis:{value:16},cha:{value:16}},attributes:{hp:{value:31+n*2,max:31+n*2},ac:{calcs:['flat'],flat:16+n%3},spellcasting:ability,movement:{speeds:{walk:30},units:'ft'}}},items:[{name:cls,type:'class',system:{identifier:cls.toLowerCase(),levels:4}},{name:subclass,type:'subclass',system:{classIdentifier:cls.toLowerCase(),identifier:subclass.toLowerCase().replaceAll(' ','-')}}]});
   actors.push(actor);
  }
  await game.settings.set(id,'castRoster',{useAssigned:false,entries:actors.map(a=>({actorId:a.id,playerId:player.id}))});
  const scene=game.scenes.find(s=>s.getFlag(id,'landing'));if(canvas.scene?.id!==scene.id)await scene.view();return{actor:actors[0].id,player:player.id,actors:actors.map(a=>a.id)};
 })()`);
 if(await ev(`!!document.querySelector('[data-cm-back]')`))await click('[data-cm-back]');await wait('#crooked-moon-landing [data-cm-destination="cast"]');await click('[data-cm-destination="cast"]');await until(`document.querySelectorAll('.cm-cast-entry').length===6`);await ev(`document.fonts.ready`);await ev(`Promise.all([...document.querySelectorAll('.cm-cast-portrait img')].map(i=>i.decode()))`);
 check('Cast link opens six actor-backed panels on same scene',await ev(`document.querySelectorAll('.cm-cast-entry').length===6&&canvas.scene.getFlag('crooked-moon-landing-page','landing')`));
 check('six live portraits decode',await ev(`[...document.querySelectorAll('.cm-cast-portrait img')].every(i=>i.complete&&i.naturalWidth>0)`));
 const geometry=await ev(`(()=>{const r=document.querySelector('.cm-cast-grid').getBoundingClientRect();const sr=canvas.dimensions.sceneRect;const p=canvas.stage.toGlobal({x:sr.x+sr.width/2,y:sr.y+sr.height/2});return{cx:r.left+r.width/2,cy:r.top+r.height/2,x:p.x,y:p.y,rows:[...new Set([...document.querySelectorAll('.cm-cast-entry')].map(e=>e.getBoundingClientRect().top))].length}})()`);
 check('three-by-two group centered on scene in both axes',Math.abs(geometry.cx-geometry.x)<1&&Math.abs(geometry.cy-geometry.y)<1&&geometry.rows===2,geometry);
 const baseline=await ev(`(()=>{const a=game.actors.get('${fixture.actor}');return{ac:a.system.attributes.ac.value,hp:a.system.attributes.hp.max,pp:a.system.skills.prc.passive,dc:a.system.attributes.spell.dc,name:a.name,img:a.img,pronouns:a.getFlag('crooked-moon-landing-page','pronouns'),source:a._source.system,classes:a.itemTypes.class.map(i=>({id:i.id,name:i.name,levels:i.system.levels})),subclass:a.itemTypes.subclass[0].name,playerName:game.users.get('${fixture.player}').name,playerPronouns:game.users.get('${fixture.player}').pronouns}})()`);
 const matches=`(()=>{const a=game.actors.get('${fixture.actor}'),r=document.querySelector('[data-cm-actor="${fixture.actor}"]');return r&&r.querySelector('[data-cm-stat="ac"] dd').textContent===String(a.system.attributes.ac.value)&&r.querySelector('[data-cm-stat="hp"] dd').textContent===String(a.system.attributes.hp.max)&&r.querySelector('[data-cm-stat="passive"] dd').textContent===String(a.system.skills.prc.passive)&&r.querySelector('[data-cm-stat="dc"] dd').textContent===String(a.system.attributes.spell.dc)})()`;
 check('initial numbers equal prepared D&D actor values',await ev(matches));
 await ev(`game.actors.get('${fixture.actor}').update({'system.attributes.ac.flat':22,'system.attributes.hp.max':44,'system.abilities.wis.value':18,'system.attributes.movement.speeds.walk':35}).then(()=>true)`);await until(matches);
 await until(`document.querySelector('[data-cm-actor="${fixture.actor}"] [data-cm-stat="ac"] dd').textContent==='22'`);
 check('AC/HP/passive/spell DC update live from real actor',await ev(matches));
 check('speed uses new prepared movement field',await ev(`document.querySelector('[data-cm-actor="${fixture.actor}"] [data-cm-stat="speed"] dd').textContent.includes('35 ft')`));
 await ev(`game.actors.get('${fixture.actor}').itemTypes.class[0].update({name:'Night Cleric','system.levels':5}).then(()=>true)`);
 await until(`document.querySelector('[data-cm-actor="${fixture.actor}"] [data-cm-stat="level"] dd').textContent==='5'`);
 check('class embedded-item updates recalculate displayed level',await ev(`document.querySelector('[data-cm-actor="${fixture.actor}"] [data-cm-field="class"]').textContent.includes('Night Cleric')`));
 await ev(`game.actors.get('${fixture.actor}').itemTypes.subclass[0].update({name:'Grave Watcher'}).then(()=>true)`);await until(`document.querySelector('[data-cm-actor="${fixture.actor}"] [data-cm-field="class"]').textContent.includes('Grave Watcher')`);check('subclass rename updates live',true);
 await ev(`game.actors.get('${fixture.actor}').update({name:'Mara Vale [Demo]',img:'systems/dnd5e/tokens/heroes/ClericDragonborn.webp','flags.crooked-moon-landing-page.pronouns':'they/she'}).then(()=>true)`);
 await until(`document.querySelector('[data-cm-actor="${fixture.actor}"] h2').textContent==='Mara Vale [Demo]'&&document.querySelector('[data-cm-actor="${fixture.actor}"] .cm-cast-pronouns').textContent==='they/she'`);
 check('PC name/art/pronouns update live',await ev(`document.querySelector('[data-cm-actor="${fixture.actor}"] img').getAttribute('src').endsWith('ClericDragonborn.webp')`));
 await ev(`game.users.get('${fixture.player}').update({name:'Updated Demo Player',pronouns:'she/they'}).then(()=>true)`);await until(`document.querySelector('[data-cm-actor="${fixture.actor}"] .cm-cast-player').textContent.includes('Updated Demo Player')`);
 check('native player name and pronouns update live',await ev(`document.querySelector('[data-cm-actor="${fixture.actor}"] .cm-cast-player').textContent.includes('(she/they)')`));
 // Restore only our demonstration records after live-update assertions.
 await ev(`(async()=>{const a=game.actors.get('${fixture.actor}');await a.itemTypes.class[0].update({name:${JSON.stringify(baseline.classes[0].name)},'system.levels':${baseline.classes[0].levels}});await a.itemTypes.subclass[0].update({name:${JSON.stringify(baseline.subclass)}});await a.update({name:${JSON.stringify(baseline.name)},img:${JSON.stringify(baseline.img)},'flags.crooked-moon-landing-page.pronouns':${JSON.stringify(baseline.pronouns)},'system.attributes.ac.flat':${baseline.source.attributes.ac.flat},'system.attributes.hp.max':${baseline.source.attributes.hp.max},'system.abilities.wis.value':${baseline.source.abilities.wis.value},'system.attributes.movement.speeds.walk':${baseline.source.attributes.movement.speeds.walk}});await game.users.get('${fixture.player}').update({name:${JSON.stringify(baseline.playerName)},pronouns:${JSON.stringify(baseline.playerPronouns)}});return true})()`);await until(matches);
 await ev(`canvas.pan({x:960,y:600,scale:5/6});true`);await sleep(300);
 const fit=await ev(`Array.from(document.querySelectorAll('.cm-cast-card'),card=>{const r=card.getBoundingClientRect(),details=card.querySelector('.cm-cast-details');return{overflow:details.scrollHeight>details.clientHeight,bottom:r.bottom}})`);check('all basic stats fit within their panels',fit.every(x=>!x.overflow),fit);
 const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,'cast-six-panels.png'),Buffer.from(shot.data,'base64'));
 const before=await ev(`({width:document.querySelector('.cm-cast-grid').getBoundingClientRect().width,scale:canvas.stage.scale.x})`);await ev(`canvas.pan({scale:.6});true`);const after=await ev(`({width:document.querySelector('.cm-cast-grid').getBoundingClientRect().width,scale:canvas.stage.scale.x})`);check('Cast page scales with same background',Math.abs(after.width/before.width-after.scale/before.scale)<.001,{before,after});
 await ev(`canvas.pan({scale:5/6});true`);await click('[data-cm-configure]');await wait('[data-cm-roster-rows]');check('native GM roster editor exposes six actor/player mappings',await ev(`document.querySelectorAll('.cm-cast-config-row').length===6`));await click('button[data-action="cancel"]');
 await click(`[data-cm-open-actor="${fixture.actor}"]`);await until(`game.actors.get('${fixture.actor}').sheet.rendered`);check('portrait opens actual character sheet',true);await ev(`game.actors.get('${fixture.actor}').sheet.close().then(()=>true)`);
 await click('[data-cm-back]');check('back returns to original landing navigation',await ev(`document.querySelectorAll('.cm-link').length===5`));await click('[data-cm-destination="cast"]');check('reopening Cast uses current actors',await ev(`document.querySelectorAll('.cm-cast-entry').length===6`));
 check('no runtime exceptions',errors.length===0,errors);console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.passed)}));
}catch(e){checks.push({name:'live Cast integration',passed:false,error:String(e)});console.error(e)}
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2));ws.close();process.exitCode=checks.some(c=>!c.passed)?1:0;
