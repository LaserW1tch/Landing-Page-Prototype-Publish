// Paste into a Foundry Script Macro after enabling the module. GM only.
const landingModule = game.modules.get('crooked-moon-landing-page');
if (!landingModule?.active || !landingModule.api) {
  ui.notifications.warn('Enable The Crooked Moon — Campaign Landing first.');
} else if (!game.user.isGM) {
  ui.notifications.warn('Only the GM can create or repair the landing scene.');
} else {
  await landingModule.api.install();
}
