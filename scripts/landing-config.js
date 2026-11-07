import { MODULE_ID, DESTINATIONS, escapeHTML } from './presentation.js';

export const DEFAULT_LANDING = {
  title: 'Your Campaign', buttons: DESTINATIONS.filter(d => !d.special).map(d => d.key), maps: [], titleFont: 'Crimson Ritual', buttonFont: 'Cormorant Garamond',
  background: '', outsideColor: '#111315', buttonStyle: 'gothic', glow: '#a363ff', titleSize: 150, buttonSize: 34
};

const FONTS = [
  ['Cormorant Garamond', 'CormorantGaramond.ttf'], ['Crimson Ritual', 'CrimsonRitual.ttf'],
  ['Marshal the Dead', 'MarshalTheDead-ywjxM.ttf'], ['Dreamhour', 'DreamhourRegular-lxJpq.ttf'],
  ['Dragonslapper', 'DragonslapperRegular-6z1D.ttf'], ['Unzialish', 'Unzialish-nrxO.ttf'],
  ['Darlington Demo', 'DarlingtonDemo-z8xjG.ttf'], ['Elven Commonspeak', 'Elvencommonspeak-0WXz.ttf']
];
const STYLES = ['gothic', 'parchment', 'etched', 'arcane', 'minimal', 'iron'];
const GLOWS = ['#a363ff', '#ff4d6d', '#ff9f43', '#ffe66d', '#7bed9f', '#70d6ff', '#ff70a6', '#f8f9fa'];

function fontFace(name, file) {
  const id = `cm-font-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (!document.getElementById(id)) {
    const style = document.createElement('style'); style.id = id;
    style.textContent = `@font-face{font-family:"${name}";src:url("modules/${MODULE_ID}/${file}") format("truetype");font-display:swap}`;
    document.head.append(style);
  }
}

export function applyLandingTypography(root, config = {}) {
  const c = { ...DEFAULT_LANDING, ...config };
  if (config.font && !config.titleFont) c.titleFont = config.font;
  if (config.font && !config.buttonFont) c.buttonFont = config.font;
  const titleFont = FONTS.find(([name]) => name === (c.titleFont || c.font)) || FONTS[1]; fontFace(...titleFont);
  const buttonFont = FONTS.find(([name]) => name === (c.buttonFont || c.font)) || FONTS[0]; fontFace(...buttonFont);
  root.style.setProperty('--cm-title-font', `"${titleFont[0]}"`);
  root.style.setProperty('--cm-button-font', `"${buttonFont[0]}"`);
  root.style.setProperty('--cm-user-title-size', `${Number(c.titleSize)}px`);
  root.style.setProperty('--cm-user-button-size', `${Number(c.buttonSize)}px`);
  root.style.setProperty('--cm-user-glow', c.glow);
  root.dataset.buttonStyle = STYLES.includes(c.buttonStyle) ? c.buttonStyle : STYLES[0];
  return c;
}

export function applyLandingConfig(root, config = {}) {
  // Keep all backgrounds on the Foundry Scene canvas. A duplicate HTML image
  // or video here would cover canvas effects such as FXMaster particles and
  // sit outside the canvas pipeline used by FXMaster filters.
  applyLandingTypography(root, config);
}

export async function configureLanding() {
  if (!game.user.isGM) throw new Error('Only the GM can customize the landing page.');
  const config = { ...DEFAULT_LANDING, ...game.settings.get(MODULE_ID, 'landingConfig') };
  const checked = key => config.buttons.includes(key) ? 'checked' : '';
  const content = `<div class="cm-landing-config">
    <label>Campaign title<input name="title" maxlength="80" value="${escapeHTML(config.title)}"></label>
    <label>Background image<div class="cm-file-choice"><input name="background" value="${escapeHTML(config.background)}" readonly placeholder="No image selected"><button type="button" data-cm-pick-background>Browse files</button></div></label>
    <label>Title font<select name="titleFont">${FONTS.map(([name]) => `<option ${config.titleFont === name || (!config.titleFont && config.font === name) ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
    <label>Button font<select name="buttonFont">${FONTS.map(([name]) => `<option ${config.buttonFont === name || (!config.buttonFont && config.font === name) ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
    <label>Outside scene color<input type="color" name="outsideColor" value="${escapeHTML(config.outsideColor)}"><small>Dark canvas color visible around the landing Scene.</small></label>
    <label>Button appearance<select name="buttonStyle">${STYLES.map(style => `<option value="${style}" ${config.buttonStyle === style ? 'selected' : ''}>${style[0].toUpperCase() + style.slice(1)}</option>`).join('')}</select></label>
    <label>Hover glow<select name="glow">${GLOWS.map((color,index) => `<option value="${color}" ${config.glow === color ? 'selected' : ''}>${['Violet','Crimson','Amber','Gold','Green','Blue','Rose','White'][index]}</option>`).join('')}</select><span class="cm-color-swatch" data-cm-color-swatch style="--cm-swatch:${config.glow}"></span></label>
    <fieldset><legend>Landing buttons</legend>${DESTINATIONS.map(d => `<label class="cm-config-check"><input type="checkbox" name="button-${d.key}" ${checked(d.key)}>${escapeHTML(d.name)}</label>`).join('')}</fieldset>
    <fieldset><legend>Maps button destinations (up to 3)</legend><p>Choose existing scenes. These are opened for the current user only; the shared active scene does not change.</p>${[0,1,2].map(index => `<label>Map ${index+1}<select name="map-${index}"><option value="">— None —</option>${game.scenes.contents.filter(s => !s.getFlag(MODULE_ID,'landing')).sort((a,b)=>a.name.localeCompare(b.name)).map(s=>`<option value="${s.id}" ${config.maps?.[index]===s.id?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}</select></label>`).join('')}</fieldset>
    <fieldset><legend>Text sizes (px)</legend>${[['titleSize','Title',60,240],['buttonSize','Button titles',18,64]].map(([name,label,min,max]) => `<label>${label}<input type="number" name="${name}" min="${min}" max="${max}" value="${config[name]}"></label>`).join('')}</fieldset>
  </div>`;
  const dialog = new foundry.applications.api.DialogV2({ window: { title: 'Customize Landing Page' }, position: { width: 620 }, content,
    buttons: [{ action: 'save', label: 'Save choices', default: true, callback: async (_event, button) => {
      const form = button.form;
      const buttons = DESTINATIONS.filter(d => !d.special && form.elements[`button-${d.key}`].checked).map(d => d.key);
      if (form.elements['button-maps'].checked) buttons.push('maps');
      if (!buttons.length) { ui.notifications.warn('Select at least one landing button.'); return false; }
      const maps = [0,1,2].map(index => form.elements[`map-${index}`].value).filter(Boolean);
      const next = { title: form.elements.title.value.trim() || 'Your Campaign', background: form.elements.background.value.trim(), titleFont: form.elements.titleFont.value, buttonFont: form.elements.buttonFont.value, outsideColor: form.elements.outsideColor.value, buttonStyle: form.elements.buttonStyle.value, glow: form.elements.glow.value, buttons, maps };
      for (const name of ['titleSize','buttonSize']) next[name] = Math.max(18, Math.min(240, Number(form.elements[name].value) || DEFAULT_LANDING[name]));
      await game.settings.set(MODULE_ID, 'landingConfig', next);
      const landingScene = game.scenes.find(scene => scene.getFlag(MODULE_ID, 'landing'));
      if (landingScene && next.background) {
        const levels = landingScene.levels.contents;
        if (levels.length) await landingScene.updateEmbeddedDocuments('Level', levels.map(level => ({ _id: level.id, 'background.src': next.background })));
        if (landingScene.background?.src !== next.background) await landingScene.update({ 'background.src': next.background });
        if (canvas.scene?.id === landingScene.id) await landingScene.view({ level: landingScene.initialLevel.id });
      }
      if (landingScene?.initialLevel && landingScene.initialLevel.background.color !== next.outsideColor) {
        await landingScene.initialLevel.update({ 'background.color': next.outsideColor });
      }
      ui.notifications.info('Landing page choices saved.');
    } }, { action: 'cancel', label: 'Cancel' }] });
  dialog.addEventListener('render', () => {
    const root = dialog.element;
    const background = root.querySelector('[name="background"]');
    root.querySelector('[data-cm-pick-background]')?.addEventListener('click', () => new FilePicker({
      type: 'imagevideo', current: background.value || undefined,
      callback: path => { background.value = path; background.dispatchEvent(new Event('change', { bubbles: true })); }
    }).render(true));
    const glow = root.querySelector('[name="glow"]');
    const swatch = root.querySelector('[data-cm-color-swatch]');
    glow?.addEventListener('change', () => swatch.style.setProperty('--cm-swatch', glow.value));
  });
  return dialog.render({ force: true });
}
