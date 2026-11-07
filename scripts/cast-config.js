import { MODULE_ID } from './presentation.js';
import { escapeHTML as e, resolveRoster, validateRoster } from './cast-data.js';

function options(collection, value, label, selected) {
  return collection.map(item => `<option value="${e(value(item))}" ${value(item) === selected ? 'selected' : ''}>${e(label(item))}</option>`).join('');
}

function rowMarkup(entry = {}) {
  const actor = game.actors.get(entry.actorId);
  return `<div class="cm-cast-config-row">
    <label>Character actor<select name="actorId"><option value="">— Empty slot —</option>${options(game.actors.contents.filter(a => a.type === 'character').sort((a,b) => a.name.localeCompare(b.name)), a => a.id, a => a.name, entry.actorId)}</select></label>
    <label>Player<select name="playerId"><option value="">Use assigned player</option>${options(game.users.contents, u => u.id, u => u.name, entry.playerId)}</select></label>
    <label>PC pronouns<input name="pcPronouns" value="${e(entry.pronouns ?? actor?.getFlag(MODULE_ID, 'pronouns') ?? '')}" placeholder="e.g. they/them"></label>
    <button type="button" data-cm-remove-row aria-label="Remove cast slot">×</button>
  </div>`;
}

export async function configureCast() {
  if (!game.user.isGM) throw new Error('Only the Game Master can configure the cast.');
  const config = game.settings.get(MODULE_ID, 'castRoster');
  const roster = resolveRoster(config, game.users.contents);
  const rows = roster.length ? roster : [{}];
  const content = `<div class="cm-cast-config">
    <p>Statistics, character names and art are read directly from the selected actors. Player names and pronouns come from Foundry’s User Configuration. PC pronouns are stored on the character actor.</p>
    <label><input type="checkbox" name="useAssigned" ${config.useAssigned !== false ? 'checked' : ''}> Automatically use players’ assigned characters</label>
    <p class="cm-cast-config-hint">For a custom order or unassigned PCs, turn off automatic selection. Blank slots are ignored. Up to six characters appear per page.</p>
    <div data-cm-roster-rows>${rows.map(rowMarkup).join('')}</div>
    <button type="button" data-cm-add-row>Add character slot</button>
    <label class="cm-cast-sharing"><input type="checkbox" name="shareActors"> Share selected actors with all players (Observer)</label>
    <p class="cm-cast-config-hint">Observer permits reading the whole character sheet, not just these summary stats. Leave this unchecked to preserve permissions. Unshared actors display a locked card. You can set individual permissions in Foundry instead.</p>
  </div>`;
  const dialog = new foundry.applications.api.DialogV2({
    window: { title: 'The Crooked Moon — Manage Cast' }, position: { width: 880 },
    content,
    buttons: [
      { action: 'save', label: 'Save cast', default: true, callback: async (_event, button) => {
        const form = button.form;
        const useAssigned = form.elements.useAssigned.checked;
        const entries = [...form.querySelectorAll('.cm-cast-config-row')].map(row => ({
          actorId: row.querySelector('[name="actorId"]').value,
          playerId: row.querySelector('[name="playerId"]').value,
          pronouns: row.querySelector('[name="pcPronouns"]').value.trim()
        })).filter(entry => entry.actorId);
        validateRoster(entries, game.actors);
        const selected = useAssigned ? resolveRoster({ useAssigned: true }, game.users.contents) : entries;
        validateRoster(selected, game.actors);
        for (const entry of entries) {
          const actor = game.actors.get(entry.actorId);
          if (actor.getFlag(MODULE_ID, 'pronouns') !== entry.pronouns) await actor.setFlag(MODULE_ID, 'pronouns', entry.pronouns);
        }
        if (form.elements.shareActors.checked) {
          for (const entry of selected) {
            const actor = game.actors.get(entry.actorId);
            if ((actor.ownership.default ?? 0) < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) await actor.update({ 'ownership.default': CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER });
          }
        }
        await game.settings.set(MODULE_ID, 'castRoster', { useAssigned, entries: useAssigned ? (config.entries ?? []) : entries.map(({ actorId, playerId }) => ({ actorId, playerId })) });
        ui.notifications.info('Cast updated. Actor statistics remain live.');
      } },
      { action: 'cancel', label: 'Cancel' }
    ]
  });
  dialog.addEventListener('render', () => {
    const root = dialog.element;
    const mode = root.querySelector('[name="useAssigned"]');
    const rows = root.querySelector('[data-cm-roster-rows]');
    let manualDraft = config.useAssigned === false ? null : (config.entries ?? []);
    const readDraft = () => [...rows.querySelectorAll('.cm-cast-config-row')].map(row => ({
      actorId: row.querySelector('[name="actorId"]').value,
      playerId: row.querySelector('[name="playerId"]').value,
      pronouns: row.querySelector('[name="pcPronouns"]').value
    }));
    const sync = () => {
      root.querySelectorAll('[name="actorId"], [name="playerId"], [data-cm-add-row], [data-cm-remove-row]').forEach(input => { input.disabled = mode.checked; });
    };
    mode.addEventListener('change', () => {
      if (mode.checked) {
        manualDraft = readDraft();
        const assigned = resolveRoster({ useAssigned: true }, game.users.contents);
        rows.innerHTML = (assigned.length ? assigned : [{}]).map(rowMarkup).join('');
      } else {
        rows.innerHTML = (manualDraft?.length ? manualDraft : [{}]).map(rowMarkup).join('');
      }
      sync();
    });
    root.querySelector('[data-cm-add-row]').addEventListener('click', () => {
      root.querySelector('[data-cm-roster-rows]').insertAdjacentHTML('beforeend', rowMarkup()); sync();
    });
    root.addEventListener('click', event => { event.target.closest('[data-cm-remove-row]')?.closest('.cm-cast-config-row')?.remove(); });
    root.addEventListener('change', event => {
      if (event.target.name !== 'actorId') return;
      const actor = game.actors.get(event.target.value);
      event.target.closest('.cm-cast-config-row').querySelector('[name="pcPronouns"]').value = actor?.getFlag(MODULE_ID, 'pronouns') ?? '';
    });
    sync();
  });
  return dialog.render({ force: true });
}
