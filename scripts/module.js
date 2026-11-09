import { MODULE_ID, DESTINATIONS, landingMarkup } from './presentation.js';
import { installLanding } from './installer.js';
import { sceneOverlayTransform } from './scene-transform.js';
import { getCastModels } from './cast-data.js';
import { castMarkup } from './cast-page.js';
import { configureCast } from './cast-config.js';
import { DEFAULT_LANDING, applyLandingConfig, applyLandingTypography, configureLanding } from './landing-config.js';

let generation = 0;
let currentPage = 'landing';
let castPage = 0;
let castRefreshFrame = 0;
let returnLandingSceneId = null;

function openCast() {
  if (!canvas.ready || !canvas.scene?.getFlag(MODULE_ID, 'landing')) return ui.notifications.warn('View the campaign landing scene first.');
  currentPage = 'cast';
  castPage = 0;
  return renderLanding();
}

function requestCastRefresh() {
  if (currentPage !== 'cast' || castRefreshFrame) return;
  castRefreshFrame = requestAnimationFrame(() => { castRefreshFrame = 0; renderLanding(); });
}

function removeLanding() {
  generation++;
  const root = document.getElementById('crooked-moon-landing');
  root?.remove();
  document.body.classList.remove('cm-landing-active');
}

export async function renderLanding() {
  removeLanding();
  if (!canvas.ready || !game.settings.get(MODULE_ID, 'showNavigation')) return;
  const isLanding = !!canvas.scene?.getFlag(MODULE_ID, 'landing');
  const configured = { ...DEFAULT_LANDING, ...game.settings.get(MODULE_ID, 'landingConfig') };
  const isSelectedMap = !isLanding && configured.maps?.includes(canvas.scene.id) && returnLandingSceneId;
  if (!isLanding && !isSelectedMap) return;
  const scene = canvas.scene;
  const currentGeneration = generation;
  const root = document.createElement('main');
  root.id = 'crooked-moon-landing';
  root.className = `cm-landing cm-in-foundry${currentPage === 'cast' ? ' cm-cast-route' : ''}${isSelectedMap ? ' cm-map-route' : ''}`;
  root.setAttribute('aria-label', currentPage === 'cast' ? 'Our Cast of Characters' : 'The Crooked Moon campaign landing');
  root.innerHTML = isSelectedMap ? '<button class="cm-map-back" data-cm-map-back type="button">← Back to landing page</button>' : currentPage === 'cast' ? castMarkup(getCastModels(), { page: castPage, isGM: game.user.isGM }) : landingMarkup(configured, (configured.maps || []).map(id => game.scenes.get(id)).filter(Boolean));
  if (isLanding && currentPage === 'landing') applyLandingConfig(root, configured);
  else if (currentPage === 'cast') applyLandingTypography(root, configured);
  // Buttons sit above the board, so Foundry's board-only wheel handler cannot
  // see wheel events over them. Use the same zoom increments via public pan().
  root.addEventListener('wheel', event => {
    if (!canvas.ready) return;
    const delta = event.deltaY || (event.shiftKey ? event.deltaX : 0);
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    canvas.pan({ scale: canvas.stage.scale.x * (delta < 0 ? 1.05 : 0.95) });
  }, { passive: false });
  const references = scene.getFlag(MODULE_ID, 'journals') ?? {};
  for (const destination of DESTINATIONS) {
    const button = root.querySelector(`[data-cm-destination="${destination.key}"]`);
    if (!button) continue;
    button.addEventListener('click', async () => {
      if (destination.key === 'maps') { root.classList.toggle('cm-maps-open'); return; }
      if (destination.key === 'cast') return openCast();
      button.disabled = true;
      try {
        const journal = references[destination.key] ? await fromUuid(references[destination.key]) : null;
        if (!journal) return ui.notifications.warn('This campaign record is not linked yet. Ask the GM to run Create / Repair Landing.');
        if (!journal.testUserPermission(game.user, 'OBSERVER')) return ui.notifications.warn('The GM has not shared this record with you.');
        await journal.sheet.render({ force: true });
      } catch (error) {
        console.error(`${MODULE_ID} | Could not open campaign journal`, error);
        ui.notifications.error('The campaign record could not be opened.');
      } finally { button.disabled = false; }
    });
  }
  for (const button of root.querySelectorAll('[data-cm-open-map]')) button.addEventListener('click', async () => {
    const target = game.scenes.get(button.dataset.cmOpenMap);
    if (!target || !configured.maps.includes(target.id)) return ui.notifications.warn('That map is no longer configured.');
    returnLandingSceneId = scene.id;
    currentPage = 'landing';
    try { await target.view(); } catch (error) { console.error(error); ui.notifications.error('The selected map could not be opened.'); }
  });
  root.querySelector('[data-cm-map-back]')?.addEventListener('click', async () => {
    const landing = game.scenes.get(returnLandingSceneId);
    returnLandingSceneId = null;
    if (landing) await landing.view();
  });
  root.querySelector('[data-cm-back]')?.addEventListener('click', () => { currentPage = 'landing'; return renderLanding(); });
  root.querySelector('[data-cm-configure]')?.addEventListener('click', configureCast);
  root.querySelector('[data-cm-customize]')?.addEventListener('click', configureLanding);
  for (const button of root.querySelectorAll('[data-cm-cast-page]')) button.addEventListener('click', () => {
    castPage = Number(button.dataset.cmCastPage); renderLanding();
  });
  for (const button of root.querySelectorAll('[data-cm-open-actor]')) button.addEventListener('click', async () => {
    const actor = game.actors.get(button.dataset.cmOpenActor);
    if (!actor?.testUserPermission(game.user, 'OBSERVER')) return ui.notifications.warn('This character is not shared with you.');
    await actor.sheet.render({ force: true });
  });
  if (generation !== currentGeneration || canvas.scene?.id !== scene.id) return;
  document.body.append(root);
  document.body.classList.add('cm-landing-active');
  syncSceneTransform();
}

function frameScene() {
  if (!document.getElementById('crooked-moon-landing') || !canvas.ready) return;
  // A landing illustration fills the viewport; this does not change the Scene data.
  const { sceneRect } = canvas.dimensions;
  canvas.pan({ x: sceneRect.x + sceneRect.width / 2, y: sceneRect.y + sceneRect.height / 2,
    scale: Math.max(innerWidth / sceneRect.width, innerHeight / sceneRect.height) });
}

function syncSceneTransform() {
  const root = document.getElementById('crooked-moon-landing');
  if (!root || !canvas.ready) return;
  const sceneRect = canvas.dimensions.sceneRect;
  const transform = sceneOverlayTransform({
    sceneRect,
    origin: canvas.stage.toGlobal({ x: sceneRect.x, y: sceneRect.y }),
    xAxis: canvas.stage.toGlobal({ x: sceneRect.x + 1, y: sceneRect.y }),
    yAxis: canvas.stage.toGlobal({ x: sceneRect.x, y: sceneRect.y + 1 }),
    bounds: canvas.app.view.getBoundingClientRect(),
    screen: canvas.app.screen
  });
  if (!transform) return;
  root.style.width = `${transform.width}px`;
  root.style.height = `${transform.height}px`;
  root.style.transform = `matrix(${transform.matrix.join(',')})`;
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'castRoster', { name: 'Cast roster', scope: 'world', config: false, type: Object, default: { useAssigned: true, entries: [] }, onChange: requestCastRefresh });
  game.settings.register(MODULE_ID, 'landingConfig', { name: 'Landing page choices', scope: 'world', config: false, type: Object, default: DEFAULT_LANDING, onChange: renderLanding });
  game.settings.register(MODULE_ID, 'showNavigation', { name: 'Show landing navigation', hint: 'Show the campaign title and five journal links on the landing scene. Turn off temporarily when editing the scene.', scope: 'client', config: true, type: Boolean, default: true, onChange: renderLanding });
  class LandingSetup extends foundry.applications.api.ApplicationV2 {
    async render() {
      const accepted = await foundry.applications.api.DialogV2.confirm({
        window: { title: 'The Crooked Moon — Create / Repair Landing' },
        content: '<p>Create one landing scene and six journals, or reconnect existing records. Existing journal content and scene customisation are preserved. New records are readable by all players.</p><p>Maps are configured Scene links and do not create a journal. This views the scene for you only. Use Foundry’s scene activation when ready to bring your players here.</p>',
        yes: { label: 'Create / Repair Landing' }, rejectClose: false
      });
      if (accepted) {
        try { await installLanding(); await renderLanding(); }
        catch (error) { console.error(error); ui.notifications.error(`Landing setup failed: ${error.message}`); }
      }
      return this;
    }
  }
  game.settings.registerMenu(MODULE_ID, 'setup', { name: 'Create / Repair Landing', label: 'Create / Repair Landing', hint: 'Create the campaign landing scene and six linked journal records. Maps are Scene links.', icon: 'fas fa-moon', type: LandingSetup, restricted: true });
  class CastSetup extends foundry.applications.api.ApplicationV2 {
    async render() { await configureCast(); return this; }
  }
  game.settings.registerMenu(MODULE_ID, 'cast', { name: 'Cast members and PC pronouns', label: 'Manage cast', hint: 'Connect character actors and player profiles. Statistics update live.', icon: 'fas fa-users', type: CastSetup, restricted: true });
  class LandingConfigMenu extends foundry.applications.api.ApplicationV2 { async render() { await configureLanding(); return this; } }
  game.settings.registerMenu(MODULE_ID, 'landingConfigMenu', { name: 'Landing page design', label: 'Customize landing', hint: 'Choose the title, background, fonts, buttons and text sizes.', icon: 'fas fa-palette', type: LandingConfigMenu, restricted: true });
});

Hooks.once('ready', () => {
  game.modules.get(MODULE_ID).api = { install: installLanding, refresh: renderLanding, openCast, configureCast };
  // Covers enabling/reloading while the canvas is already ready.
  if (canvas.ready) renderLanding();
});
Hooks.on('canvasReady', async () => { await renderLanding(); frameScene(); });
Hooks.on('canvasTearDown', () => { currentPage = 'landing'; castPage = 0; removeLanding(); });
Hooks.on('updateScene', scene => { if (canvas.scene?.id === scene.id) renderLanding(); });
Hooks.on('canvasPan', syncSceneTransform);
addEventListener('resize', () => requestAnimationFrame(syncSceneTransform));
for (const event of ['updateActor', 'createActor', 'deleteActor', 'updateItem', 'createItem', 'deleteItem', 'updateActiveEffect', 'createActiveEffect', 'deleteActiveEffect', 'updateUser', 'createUser', 'deleteUser']) Hooks.on(event, requestCastRefresh);
