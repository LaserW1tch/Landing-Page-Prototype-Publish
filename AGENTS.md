# Crooked Moon landing page

Target: Foundry VTT14.367. Project delivers a campaign-specific module, native Scene and five JournalEntry destinations. Preserve supplied background image and existing authored journal content. Landing design and the live actor-backed Cast page are authorized. The Story So Far and Rules journals now have authored campaign content; the remaining three destination contents await discussion.

## Authorized local testing

The user explicitly authorizes changes to and module installation for the local Foundry world **testbed**, which exists specifically for testing (confirmed2026-11-06). No repeat approval is needed for routine testbed module/world changes. Other worlds are outside this authorization. Local install: `/mnt/i/Foundry VTT local/Foundry Virtual Tabletop`; userdata: `/mnt/i/Foundry VTT local/userdata`. Sandbox approval requirements still apply to writes outside the session writable roots.

The module is junction-linked into local userdata/Data/modules/crooked-moon-landing-page. Keep a recoverable checkpoint before substantial world changes. Do not distribute test-world backups, user data or verification profiles in release ZIPs.

## Confirmed visual corrections — 2026-11-06

The entire landing overlay must remain anchored to the Scene and share its camera transform: borders, tint, title, icons and buttons all shrink/enlarge and pan with the background. Never restore a viewport-fixed independent navigation layer. Wheel over buttons must also zoom the scene. Keep a fixed scene-space layout while zooming; do not reflow it according to zoom level.

Use the owner-supplied Crimson Ritual font for heading treatments. The rejected Grenze Gotisch is retained only as an old asset. Remove and do not restore these decorative main-page lines: “A campaign of folk horror”, “Gather close. The night is listening.”, “The campaign record”, “Five records · One crooked moon”. Preserve the five requested journal destinations.

## Live Cast requirements — 2026-11-06

Cast is a per-client route on the landing Scene, not a static journal or new globally activated scene. Match the user sketch: art left, PC identity/stats right, native player name/pronouns below, six-panel group centered in both scene axes. All values come from prepared Actor/Item/User data and refresh across clients. Never save copied stat snapshots or compute separate AC/passive/DC formulas. PC pronouns are actor flags; player pronouns are native User fields. Preserve observer/owner permission checks and explicit opt-in sharing. Configuration includes automatic assigned-PC mode and manual actor/player mappings. Testbed demo records are not real campaign characters and must never ship in releases. See docs/CAST.md and the latest docs/VERIFICATION.md checkpoint.
