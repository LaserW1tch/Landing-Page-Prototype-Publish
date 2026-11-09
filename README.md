# The Crooked Moon — Campaign Landing

A customizable gothic landing scene for **Foundry VTT 14.367**. The landing overlay anchors to scene coordinates, so its title, borders and buttons zoom and pan with the background. Gothic buttons use the supplied ornamental frame over a transparent background. The live Cast page uses a separate readable typeface and live actor data. The landing offers these destinations:

1. The Story So Far
2. Our Cast of Characters
3. Important Items, NPCs, and Details
4. The Graveyard
5. Rules
6. Quest Log
7. Maps (configured Scene links)

Journal destinations are installed with blank pages for the GM to author. Rebuilding the landing reconnects existing journals without changing their pages or content. Cast opens the live character gallery; Maps opens configured Scenes for the current client.

## Preview

With the preview server running, open **http://localhost:5174/preview.html**. Each card opens a preview of its destination. This browser preview is not the Foundry runtime.

To start it manually from this directory:

```sh
python3 -m http.server 5174 --bind 0.0.0.0
```

## Foundry installation

This module has **no third-party/community dependencies** and no additional module dependencies. FXMaster is optional. The live Cast statistics target **D&D5e6.0.6**; the landing itself uses core Foundry. It uses a real Foundry Scene, standard JournalEntry documents, ordinary document permissions and core journal sheets. The module supplies the scene-anchored navigation, live Cast view and explicit GM setup actions. It supplies the single-click, keyboard-accessible navigation; custom card navigation is not built into core Foundry.

1. Copy this directory into `Data/modules/crooked-moon-landing-page/`, keeping `module.json` directly inside that folder. Alternatively extract the supplied release ZIP into `Data/modules/`.
2. Restart Foundry to discover the module.
3. Open the desired world and enable **The Crooked Moon — Campaign Landing** in Manage Modules.
4. Open Configure Settings → The Crooked Moon — Campaign Landing → **Create / Repair Landing**.
5. The action creates one landing scene, one journal folder and six blank journals. It views the scene for the GM only. Activate the scene using Foundry’s normal controls when you want to bring players here.
6. Single-click a card or Tab to it and press Enter/Space. Cast opens the live gallery; journal buttons open their blank journals; Maps shows configured Scene links.
7. On Cast, the GM can use **Manage cast** to choose actors, their order, players and PC pronouns. By default, a fresh world uses non-GM players’ assigned characters automatically. See [Cast setup and live fields](docs/CAST.md).

For The Forge, install using the manifest URL in `module.json`, restart the server, enable the module, then run Create / Repair Landing in the destination world. Local testbed validation does not constitute a separate hosted-Forge test.

Alternative GM setup: paste `scripts/open-landing-macro.js` into a Script Macro, or execute:

```js
await game.modules.get('crooked-moon-landing-page').api.install();
```

The action can be run again: it reuses flagged records, repairs missing destinations, and preserves existing journal content, permissions and scene customisation. It never overwrites an unrelated scene. Newly created journals are **Observer for all players**; restrict individual journals in Foundry when appropriate. The menu and macro are GM-only.

## Live Cast page

The six-panel reference layout is implemented as a centered group of up to three columns and two rows. Fewer characters remain centered; more than six paginate. Art comes from each actor’s portrait. Names, class/subclass, level, max HP, AC, passive perception, movement and primary spell DC read the current prepared actor data; there is no stat snapshot or second calculation. Actor/item/effect updates refresh the open view. Native User updates refresh the player name/pronouns line. PC pronouns live in the actor’s module flag and can be edited through Manage cast. Clicking a portrait opens its character sheet. Return to the village preserves the shared background and camera.

The GM can alternatively open **Configure Settings → The Crooked Moon → Cast members and PC pronouns**. Connect your actual character actors and Foundry users there. Use the explicit sharing option only if you want to grant everyone Observer access to the selected full character sheets; otherwise existing actor permissions are preserved. Unauthorized actors show locked panels instead of leaking statistics.

Testbed contains six clearly marked demo actors in **Crooked Moon — Cast Demo**, one marked demo player profile, and a custom demo roster. These are local QA records, not campaign characters, and are not included in the release ZIP. Replace the demo roster in Manage cast when using real PCs. New worlds do not automatically create demo characters or players.

## Editing and recovery

- Edit journal contents normally in Foundry. Do not delete module flags unless intentionally detaching a record.
- The navigation displays only on the flagged landing scene. Switching scenes removes it.
- The landing illustration is initially framed to fill the viewport. The entire overlay follows native scene zoom and pan, including mousewheel zoom over the cards. Camera zoom does not reflow or detach the layout. Foundry’s central pause graphic is hidden on this scene only; the world’s actual paused state is preserved.
- Selected background images and videos are assigned to the Foundry Scene itself. The landing UI does not place a second HTML background over the canvas, so canvas effects such as FXMaster particles and filters can render with the scene. FXMaster is optional and is not a module dependency.
- To temporarily hide the navigation while editing the scene, disable **Show landing navigation** in the module’s client settings. This affects your client only.
- Disabling the module removes its interactive overlay but preserves the Scene and all journals. Players can still open shared records from the Journal sidebar. Re-enable it to restore the cards.
- Fonts are bundled locally. Crimson Ritual was supplied by the project owner; its original source file is preserved. Cormorant Garamond and the retained, inactive Grenze Gotisch include their original SIL Open Font License files. No Google Fonts/network request occurs at runtime.
- The design uses static moonlight, restrained aged-brass accents and accessible hover/focus states. It includes no autoplay audio, flashing or required animation.

## Local testing authorization

The project owner explicitly authorizes module installation and changes in the local Foundry world **testbed** for testing. Other worlds are not covered. The project is junction-linked into local `userdata/Data/modules/crooked-moon-landing-page`.

Keep `backups/` private and outside release archives. It contains a pre-test backup of testbed and may include world/user data.

## Files and validation

- `module.json`, `scripts/module.js`: Foundry entry point and navigation lifecycle.
- `scripts/installer.js`: explicit, repeat-safe GM installer.
- `scripts/cast-data.js`, `cast-page.js`, `cast-config.js`, `styles/cast.css`: live actor/user projection, centered panels and GM roster editor.
- `scripts/scene-transform.js`: camera-to-DOM registration shared by landing and Cast.
- `scripts/presentation.js`, `styles/landing.css`: shared design, exact link names, original vector icons and bundled fonts.
- `assets/moonlit-village.png`: unchanged supplied background, 1920×1200.
- `preview.html`: interactive standalone design preview.
- `tests/installer.test.mjs`: permission, recovery and repeated/concurrent setup tests.
- `docs/verification/`: screenshots and recorded checks; see `docs/VERIFICATION.md` for actual test scope.

Run `npm test` (no dependencies or installation needed). The release ZIP contains runtime assets and instructions, not backups, test saves or screenshots.

Rebuild the manual-install ZIP with `python3 scripts/package.py`. Nothing is published automatically.

## Sources

Foundry: [Scenes](https://foundryvtt.com/article/scenes/), [Journal Entries](https://foundryvtt.com/article/journal/), [V14 API](https://foundryvtt.com/api/v14/).

Active heading font: **Crimson Ritual**, supplied as `CrimsonRitual-aYJ2R.ttf` and bundled byte-for-byte as `assets/fonts/CrimsonRitual.ttf`. The original font metadata links to https://putracetol.com/licenses/; this project does not relicense it.

Other font assets: [Grenze Gotisch](https://github.com/google/fonts/tree/main/ofl/grenzegotisch), [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond), SIL Open Font License1.1. Their original license notices are bundled in `assets/fonts/`.

Campaign artwork supplied by the project owner. This is a custom campaign interface, not an official Crooked Moon publication. No campaign text or official logos are included.
