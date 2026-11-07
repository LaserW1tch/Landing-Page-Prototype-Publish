import { escapeHTML as e } from './cast-data.js';

export function castMarkup(models, { page = 0, isGM = false } = {}) {
  const pageCount = Math.max(1, Math.ceil(models.length / 6));
  page = Math.max(0, Math.min(page, pageCount - 1));
  const visible = models.slice(page * 6, page * 6 + 6);
  const columns = Math.min(3, visible.length || 1);
  return `<div class="cm-frame" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    <header class="cm-cast-header">
      <button type="button" class="cm-cast-control" data-cm-back>← Back</button>
      <h1>Our Cast of Characters</h1>
      ${isGM ? '<button type="button" class="cm-cast-control" data-cm-configure>Manage cast</button>' : '<span></span>'}
    </header>
    <section class="cm-cast-body" aria-label="Player characters">
      ${visible.length ? `<div class="cm-cast-grid" style="--cm-cast-columns:${columns};max-width:${columns * 560 + (columns - 1) * 24}px">${visible.map(renderCard).join('')}</div>` : `
        <div class="cm-cast-empty"><h2>The company awaits.</h2><p>${isGM ? 'Use Manage cast to choose character actors and their players, or assign characters in Foundry’s User Configuration.' : 'The Game Master has not connected the cast yet.'}</p></div>`}
    </section>
    ${pageCount > 1 ? `<nav class="cm-cast-pagination" aria-label="Cast pages"><button type="button" class="cm-cast-control" data-cm-cast-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>← Previous</button><span>${page + 1} / ${pageCount}</span><button type="button" class="cm-cast-control" data-cm-cast-page="${page + 1}" ${page === pageCount - 1 ? 'disabled' : ''}>Next →</button></nav>` : ''}`;
}

function renderCard(model) {
  if (model.missing || model.locked) return `<article class="cm-cast-entry"><div class="cm-cast-card cm-cast-unavailable"><h2>${e(model.name)}</h2><p>${model.locked ? 'The GM needs to share this character with Observer permission.' : 'Choose a replacement actor in Manage cast.'}</p></div></article>`;
  return `<article class="cm-cast-entry" data-cm-actor="${e(model.actorId)}">
    <div class="cm-cast-card">
      <button type="button" class="cm-cast-portrait" data-cm-open-actor="${e(model.actorId)}" aria-label="Open ${e(model.name)}’s character sheet"><img src="${e(model.image)}" alt="${e(model.name)}" decoding="async"></button>
      <div class="cm-cast-details">
        <header><h2>${e(model.name)}</h2>${model.pronouns ? `<p class="cm-cast-pronouns">${e(model.pronouns)}</p>` : ''}</header>
        <p class="cm-cast-class" data-cm-field="class">${e(model.classText)}</p>
        <dl class="cm-cast-stats">${model.stats.map(stat => `<div data-cm-stat="${stat.key}"><dt>${stat.label}</dt><dd>${e(stat.value)}</dd></div>`).join('')}</dl>
      </div>
    </div>
    <p class="cm-cast-player">Played by: <span data-cm-field="player">${e(model.playerName)}</span>${model.playerPronouns ? ` <span data-cm-field="player-pronouns">(${e(model.playerPronouns)})</span>` : ''}</p>
  </article>`;
}
