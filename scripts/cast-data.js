import { MODULE_ID } from './presentation.js';

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function number(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? String(value) : '—';
}

export function assignedRoster(users) {
  const seen = new Set();
  return Array.from(users).filter(user => !user.isGM && user.character?.type === 'character')
    .flatMap(user => {
      if (seen.has(user.character.id)) return [];
      seen.add(user.character.id);
      return [{ actorId: user.character.id, playerId: user.id }];
    });
}

export function resolveRoster(config, users) {
  return config?.useAssigned !== false ? assignedRoster(users) : (config.entries ?? []);
}

export function validateRoster(entries, actors) {
  const seen = new Set();
  for (const entry of entries) {
    const actor = actors.get(entry.actorId);
    if (!actor || actor.type !== 'character') throw new Error('Choose an existing player-character actor for every cast slot.');
    if (seen.has(actor.id)) throw new Error(`${actor.name} is selected more than once.`);
    seen.add(actor.id);
  }
}

function safeImage(src) {
  return src && !/^(?:javascript|vbscript|data):/i.test(src) ? src : 'icons/svg/mystery-man.svg';
}

/** Prepared system data is authoritative: never calculate or cache a second set of stats. */
export function actorCastModel(actor, player, viewer) {
  if (!actor) return { missing: true, name: 'Character unavailable' };
  if (!actor.testUserPermission(viewer, 'OBSERVER')) {
    const limited = actor.testUserPermission(viewer, 'LIMITED');
    return { locked: true, actorId: actor.id, name: limited ? actor.name : 'Unshared character', image: limited ? safeImage(actor.img) : null };
  }
  const system = actor.system;
  const classes = Object.values(actor.classes ?? {});
  const classText = classes.map(cls => {
    const subclass = cls.subclass ?? actor.items?.find(i => i.type === 'subclass' && i.system.classIdentifier === (cls.system.identifier ?? cls.identifier));
    const levels = classes.length > 1 ? ` ${number(cls.system.levels)}` : '';
    return `${cls.name}${levels}${subclass ? ` · ${subclass.name}` : ''}`;
  }).join(' / ') || 'Class not set';
  const movement = system.attributes?.movement ?? {};
  const speeds = movement.speeds ?? movement;
  const units = movement.units || 'ft';
  const walking = number(speeds.walk ?? movement.speed);
  const modes = ['fly', 'swim', 'climb', 'burrow'].filter(k => Number(speeds[k]) > 0)
    .map(k => `${k.charAt(0).toUpperCase() + k.slice(1)} ${number(speeds[k])} ${units}`);
  const speed = `${walking}${walking === '—' ? '' : ` ${units}`}${modes.length ? ` · ${modes.join(' · ')}` : ''}`;
  return {
    actorId: actor.id, name: actor.name, image: safeImage(actor.img),
    pronouns: actor.getFlag(MODULE_ID, 'pronouns') ?? system.details?.pronouns ?? '',
    classText, playerName: player?.name ?? 'Unassigned', playerPronouns: player?.pronouns ?? '',
    stats: [
      { key: 'level', label: 'Level', value: number(system.details?.level) },
      { key: 'hp', label: 'Max HP', value: number(system.attributes?.hp?.max) },
      { key: 'ac', label: 'Armor Class', value: number(system.attributes?.ac?.value) },
      { key: 'passive', label: 'Passive Perception', value: number(system.skills?.prc?.passive) },
      { key: 'speed', label: 'Speed', value: speed },
      { key: 'dc', label: 'Spell Save DC', value: system.attributes?.spellcasting ? number(system.attributes?.spell?.dc ?? system.attributes?.spelldc) : '—' }
    ]
  };
}

export function getCastModels() {
  const users = game.users.contents;
  const config = game.settings.get(MODULE_ID, 'castRoster');
  return resolveRoster(config, users).map(entry => {
    const actor = game.actors.get(entry.actorId);
    const player = game.users.get(entry.playerId) ?? users.find(u => !u.isGM && u.character?.id === actor?.id);
    return actorCastModel(actor, player, game.user);
  });
}
