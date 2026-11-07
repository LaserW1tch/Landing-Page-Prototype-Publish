import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actorCastModel, assignedRoster, resolveRoster, validateRoster } from '../scripts/cast-data.js';
import { castMarkup } from '../scripts/cast-page.js';

function actor() {
  return { id:'pc1',type:'character',name:'Mara',img:'worlds/test/portrait.webp',getFlag:()=> 'she/they',testUserPermission:()=>true,classes:{cleric:{name:'Cleric',system:{levels:4},subclass:{name:'Grave Domain'}}},system:{details:{level:4},attributes:{hp:{max:31},ac:{value:17,flat:10},spellcasting:'wis',spell:{dc:14},movement:{speeds:{walk:30,fly:60},units:'ft'}},skills:{prc:{passive:16}}}};
}
const stat = (model,key) => model.stats.find(s=>s.key===key).value;

test('reads prepared actor values rather than AC source or independently calculated stats',()=>{
  const model=actorCastModel(actor(),{name:'Player',pronouns:'they/them'},{});
  assert.equal(stat(model,'ac'),'17');assert.equal(stat(model,'hp'),'31');assert.equal(stat(model,'passive'),'16');assert.equal(stat(model,'dc'),'14');assert.equal(stat(model,'level'),'4');
  assert.equal(stat(model,'speed'),'30 ft · Fly 60 ft');assert.equal(model.classText,'Cleric · Grave Domain');
});
test('a new render reads actor and player changes without a cached snapshot',()=>{
  const a=actor(),p={name:'First player',pronouns:'he/him'};actorCastModel(a,p,{});
  a.name='New name';a.img='new.webp';a.system.attributes.ac.value=21;a.system.attributes.hp.max=45;a.getFlag=()=> 'they/them';p.name='Changed player';p.pronouns='she/her';
  const model=actorCastModel(a,p,{});
  assert.equal(model.name,'New name');assert.equal(model.image,'new.webp');assert.equal(model.pronouns,'they/them');assert.equal(stat(model,'ac'),'21');assert.equal(stat(model,'hp'),'45');assert.equal(model.playerName,'Changed player');assert.equal(model.playerPronouns,'she/her');
});
test('permission-denied actor statistics are never accessed or rendered',()=>{
  const a=actor();a.testUserPermission=()=>false;Object.defineProperty(a,'system',{get(){throw Error('private data accessed')}});
  const model=actorCastModel(a,null,{});assert.equal(model.locked,true);assert.equal(model.name,'Unshared character');assert.ok(!castMarkup([model]).includes('Max HP'));
});
test('zero is retained; noncasters do not display the system fallback as a spell DC',()=>{
  const a=actor();a.system.attributes.hp.max=0;a.system.attributes.spellcasting='';a.system.attributes.movement.speeds={walk:0};const m=actorCastModel(a,null,{});
  assert.equal(stat(m,'hp'),'0');assert.equal(stat(m,'speed'),'0 ft');assert.equal(stat(m,'dc'),'—');
});
test('multiclass class/subclass records and total level stay distinct',()=>{
  const a=actor();a.classes.wizard={name:'Wizard',system:{levels:2},subclass:{name:'Divination'}};a.system.details.level=6;
  const m=actorCastModel(a,null,{});assert.equal(m.classText,'Cleric 4 · Grave Domain / Wizard 2 · Divination');assert.equal(stat(m,'level'),'6');
});
test('automatic roster uses assigned non-GM PCs and deduplicates shared characters',()=>{
  const pc=actor();const users=[{id:'gm',isGM:true,character:pc},{id:'one',character:pc},{id:'two',character:pc},{id:'three',character:{id:'npc',type:'npc'}}];
  assert.deepEqual(assignedRoster(users),[{actorId:'pc1',playerId:'one'}]);assert.deepEqual(resolveRoster({useAssigned:false,entries:[]},users),[]);
});
test('invalid or duplicate roster entries are rejected before writes',()=>{
  const actors=new Map([['pc1',actor()]]);assert.throws(()=>validateRoster([{actorId:'missing'}],actors));assert.throws(()=>validateRoster([{actorId:'pc1'},{actorId:'pc1'}],actors),/more than once/);
});
test('portrait/identity text is escaped and script URLs are rejected',()=>{
  const a=actor();a.name='<img src=x onerror=alert(1)>';a.img='javascript:alert(1)';
  const m=actorCastModel(a,{name:'<script>bad</script>'},{});const html=castMarkup([m]);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<script>'));assert.equal(m.image,'icons/svg/mystery-man.svg');
});
test('six panels form one page and additional characters paginate without losing the roster',()=>{
  const models=Array.from({length:7},(_,i)=>({...actorCastModel(actor(),null,{}),actorId:`pc${i}`,name:`PC ${i}`}));
  assert.equal((castMarkup(models).match(/data-cm-actor=/g)||[]).length,6);assert.equal((castMarkup(models,{page:1}).match(/data-cm-actor=/g)||[]).length,1);assert.ok(castMarkup(models,{page:1}).includes('PC 6'));
});
