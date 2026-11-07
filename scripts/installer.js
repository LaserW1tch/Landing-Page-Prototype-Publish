import { MODULE_ID, MODULE_PATH, DESTINATIONS } from './presentation.js';

let installation;

/** Explicit GM action only. Reuses flagged records and never overwrites journal content. */
export async function installLanding({ view = true } = {}) {
  if (!game.user.isGM) throw new Error('Only the Game Master can create the landing scene.');
  if (installation) return installation;
  installation = createOrRepair({ view });
  try { return await installation; } finally { installation = undefined; }
}

async function createOrRepair({ view }) {
  let folder = game.folders.find(f => f.type === 'JournalEntry' && f.getFlag(MODULE_ID, 'landingFolder'));
  if (!folder) folder = await Folder.create({ name: 'Campaign Records', type: 'JournalEntry', flags: { [MODULE_ID]: { landingFolder: true } } });
  const journals = {};
  // Maps is a scene chooser, not a JournalEntry destination. Keep the Cast
  // placeholder for existing worlds, where it may contain authored notes.
  for (const destination of DESTINATIONS.filter(destination => !destination.special)) {
    let journal = game.journal.find(j => j.getFlag(MODULE_ID, 'destination') === destination.key);
    if (!journal) journal = await JournalEntry.create({
      name: destination.name, folder: folder.id, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      flags: { [MODULE_ID]: { destination: destination.key } },
      pages: [{ name: destination.name, type: 'text', text: { format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: '' } }]
    });
    // Existing journals belong to the GM. Repair only reconnects them; it must
    // never rewrite pages or clear content authored since the last install.
    journals[destination.key] = journal.uuid;
  }
  let scene = game.scenes.find(s => s.getFlag(MODULE_ID, 'landing'));
  const title = 'Your Campaign';
  const background = `${MODULE_PATH}/assets/moonlit-village.png`;
  if (!scene) scene = await Scene.create({
    name: title, width: 1920, height: 1200, padding: 0,
    levels: [{ _id: 'crookedMoonLevel', name: title, background: { src: background } }],
    initialLevel: 'crookedMoonLevel',
    grid: { type: CONST.GRID_TYPES.GRIDLESS, size: 100, distance: 5, units: 'ft' },
    tokenVision: false, fog: { mode: CONST.FOG_EXPLORATION_MODES.DISABLED }, navigation: true, active: false,
    flags: { [MODULE_ID]: { landing: true, journals } }
  });
  else await scene.setFlag(MODULE_ID, 'journals', journals);
  ui.notifications.info(`${title} is ready. Six campaign journals are linked.`);
  if (view) await scene.view();
  return { scene, journals };
}
