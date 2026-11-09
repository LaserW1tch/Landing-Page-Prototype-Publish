# Release notes — v0.6.3

## Landing configuration and navigation

- Add GM-configurable landing typography, button styles, colors, and map links.
- Open configured Maps as local scenes with a return control.
- Keep the full overlay aligned with the Foundry scene camera.
- Improve Cast typography and make its return control concise.

## Installer behavior

- Create six blank journal destinations; Maps remains a configured Scene chooser.
- Preserve existing journal contents, permissions, scene names, and scene customizations during repair.
- Rename the prior Details journal and page to the current destination label without changing its content.
- Keep campaign-authored material and testbed data out of the release archive.

## Release archive

The Foundry manifest and package metadata use version `0.6.3`. The archive contains runtime scripts, styles, bundled assets, the module manifest, README, and Cast setup notes. It excludes tests, verification evidence, backups, and campaign-authored journal source.
