# Release notes — v0.6.2

## FXMaster compatibility

- Keep configured image and video backgrounds on the Foundry Scene canvas. Removed the duplicate opaque HTML background that covered FXMaster particle effects and kept the visible background outside the canvas filter pipeline.
- User reports that FXMaster and the landing page now work together in the testbed. The installed FXMaster version there is 8.4.2, verified for Foundry V14.

## Installer repairs

- Create six journal records and omit a Maps journal; Maps links to configured Scenes. Existing Maps journal records are left untouched.
- Reconnect existing landing records without renaming the landing Scene or changing its customizations or journal content.
- Updated installer tests to cover the six records and scene-name preservation.
- Tightened the ZIP to a reviewed runtime script allowlist. Removed unused campaign-specific Story, Rules, details and graveyard source files, along with private testbed verification notes, from the current release tree.
- The retained v0.6.0 and v0.6.1 ZIPs also contain those files, and earlier Git commits may retain them. No old GitHub release asset was deleted and no history rewrite was performed; review those separately if the material should no longer be public.

## Release checks

- Automated Node test suite: 3/3 test files passed.
- JavaScript syntax, JSON parsing, `git diff --check`, ZIP integrity, archive exclusions and SHA-256 generation passed.
- Foundry/FXMaster compatibility was reported successful by the project owner in the testbed; Forge-hosted testing remains pending.
- Release archive and checksum are in `releases/`.
- The release commit and annotated `v0.6.2` tag exist locally; neither has been pushed. No GitHub release has been created.
