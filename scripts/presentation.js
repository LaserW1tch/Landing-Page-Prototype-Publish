export const MODULE_ID = 'crooked-moon-landing-page';
export const MODULE_PATH = `modules/${MODULE_ID}`;

export const DESTINATIONS = Object.freeze([
  { key: 'story', name: 'The Story So Far', eyebrow: 'THE CHRONICLE', icon: 'book' },
  { key: 'graveyard', name: 'The Graveyard', eyebrow: 'IN MEMORIAM', icon: 'grave' },
  { key: 'cast', name: 'Our Cast of Characters', eyebrow: 'THE COMPANY', icon: 'portraits' },
  { key: 'quest', name: 'Quest Log', eyebrow: 'ACTIVE THREADS', icon: 'book' },
  { key: 'details', name: 'Important Items, NPCs, and Details', eyebrow: 'THE ARCHIVE', icon: 'key' },
  { key: 'rules', name: 'Rules', eyebrow: 'THE COVENANT', icon: 'scales' },
  { key: 'maps', name: 'Maps', eyebrow: 'EXPLORE', icon: 'scroll', special: true }
]);

const icons = {
  book: '<path d="M24 13C16 8 9 9 5 11v27c6-3 12-2 19 3 7-5 13-6 19-3V11c-4-2-11-3-19 2Zm0 0v28M10 16c3-1 7 0 10 2m-10 5c3-1 7 0 10 2m8-7c3-2 7-3 10-2m-10 9c3-2 7-3 10-2"/>',
  portraits: '<path d="M9 9h30v31H9zM5 5h38v39H5zM13 37c0-7 4-11 11-11s11 4 11 11M30 19c0 5-3 8-6 8s-6-3-6-8 3-7 6-7 6 2 6 7Z"/>',
  key: '<circle cx="16" cy="17" r="9"/><path d="m22 24 17 17m-8-8 5-5m0 10 5-5M13 14l6 6m0-6-6 6"/>',
  grave: '<path d="M12 39V21c0-9 5-15 12-15s12 6 12 15v18M7 40h34M24 13v17m-7-11h14M4 44h40"/><path d="m10 38-4-5m32 5 4-5"/>',
  scroll: '<path d="M13 13v22h22V13M13 13c-3 0-4-2-4-4s1-4 4-4h22c3 0 4 2 4 4s-1 4-4 4H13ZM13 35c-3 0-4 2-4 4s1 4 4 4h22c3 0 4-2 4-4s-1-4-4-4H13Z"/><path d="M17 19h14m-14 6h14m-14 6h10"/>',
  scales: '<path d="M24 7v33m-9 2h18M8 17l16-5 16 5M12 16 5 29h14Zm24 0-7 13h14ZM5 29c1 7 12 7 14 0m10 0c2 7 13 7 14 0"/><circle cx="24" cy="7" r="3"/>'
};

export function iconSVG(key) {
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key] ?? icons.book}</svg>`;
}

export function landingMarkup(config = {}, mapScenes = []) {
  const title = escapeHTML(config.title || 'Your Campaign');
  const enabled = new Set(config.buttons || DESTINATIONS.map(d => d.key));
  const destinations = DESTINATIONS.filter(d => enabled.has(d.key));
  return `<div class="cm-frame" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    <header class="cm-masthead">
      <h1>${title}</h1>
    </header>
    <section class="cm-navigation" aria-label="Campaign journals">
      <nav class="cm-links" aria-label="Campaign navigation">${destinations.map(d => `
        <button type="button" class="cm-link" data-cm-destination="${d.key}">
          <span class="cm-card-corner cm-card-corner-tl" aria-hidden="true"></span><span class="cm-card-corner cm-card-corner-br" aria-hidden="true"></span>
          <span class="cm-link-icon">${iconSVG(d.icon)}</span>
          <span class="cm-link-title">${d.name}</span>
          <span class="cm-link-symbol" aria-hidden="true">↗</span>
          <img class="cm-gothic-frame" src="${MODULE_PATH}/assets/ornaments/gothic-skull-frame.png" alt="" aria-hidden="true">
        </button>`).join('')}
      </nav>
      ${mapScenes.length ? `<div class="cm-map-submenu" aria-label="Choose a map">${mapScenes.map(scene => `<button type="button" class="cm-map-choice" data-cm-open-map="${escapeHTML(scene.id)}">${escapeHTML(scene.name)}</button>`).join('')}</div>` : ''}
    </section>`;
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
