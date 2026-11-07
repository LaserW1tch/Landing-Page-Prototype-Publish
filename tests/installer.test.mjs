import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installLanding } from '../scripts/installer.js';
import { MODULE_ID, DESTINATIONS } from '../scripts/presentation.js';

function document(data, collection, prefix) {
  const result = { ...structuredClone(data), id: `${prefix}${collection.length}`, uuid: `${prefix}.${collection.length}`, getFlag(id,key) { return this.flags?.[id]?.[key]; }, async setFlag(id,key,value) { this.flags[id][key]=value; }, sheet: { async render(){} }, async view(){ this.viewed=true; } };
  collection.push(result);
  return result;
}
beforeEach(() => {
  globalThis.game={user:{isGM:true},folders:[],journal:[],scenes:[]};
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OBSERVER:2},JOURNAL_ENTRY_PAGE_FORMATS:{HTML:1},GRID_TYPES:{GRIDLESS:0},FOG_EXPLORATION_MODES:{DISABLED:0}};
  globalThis.Folder={create:async data=>document(data,game.folders,'Folder')};
  globalThis.JournalEntry={create:async data=>document(data,game.journal,'JournalEntry')};
  globalThis.Scene={create:async data=>document(data,game.scenes,'Scene')};
  globalThis.ui={notifications:{info(){}}};
});

test('creates exactly five player-readable destinations and a non-active gridless scene',async()=>{
  const {scene,journals}=await installLanding({view:false});
  assert.equal(game.journal.length,5);assert.equal(game.scenes.length,1);
  assert.equal(scene.active,false);assert.equal(scene.grid.type,0);assert.equal(scene.tokenVision,false);
  assert.equal(scene.viewed,undefined);assert.deepEqual(Object.keys(journals),DESTINATIONS.map(d=>d.key));
  assert.ok(game.journal.every(j=>j.ownership.default===2 && j.pages.length===1));
});
test('repeat setup preserves GM-written content, permissions and scene customisation',async()=>{
  const first=await installLanding({view:false});
  const journal=game.journal[0];journal.pages[0].text.content='<p>GM campaign recap</p>';journal.ownership.default=0;
  first.scene.levels[0].background.src='custom-background.png';
  await installLanding({view:false});
  assert.equal(game.journal.length,5);assert.equal(game.scenes.length,1);assert.equal(game.folders.length,1);
  assert.equal(journal.pages[0].text.content,'<p>GM campaign recap</p>');assert.equal(journal.ownership.default,0);
  assert.equal(first.scene.levels[0].background.src,'custom-background.png');
});
test('repairs missing destination without replacing other records',async()=>{
  const {scene}=await installLanding({view:false});game.journal.splice(2,1);
  await installLanding({view:false});
  assert.equal(game.journal.length,5);assert.equal(game.scenes.length,1);
  assert.equal(game.journal.filter(j=>j.getFlag(MODULE_ID,'destination')==='details').length,1);
  assert.ok(scene.flags[MODULE_ID].journals.details);
});
test('simultaneous setup calls do not duplicate world documents',async()=>{
  await Promise.all([installLanding({view:false}),installLanding({view:false})]);
  assert.equal(game.journal.length,5);assert.equal(game.scenes.length,1);assert.equal(game.folders.length,1);
});
test('players cannot create landing documents',async()=>{
  game.user.isGM=false;await assert.rejects(installLanding(),/Game Master/);
  assert.equal(game.scenes.length,0);assert.equal(game.journal.length,0);
});
