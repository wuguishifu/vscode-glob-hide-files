# Changelog

## 0.2.0

- `hideFiles.configurationTarget` now defaults to `global` (user settings) instead of `workspace`, so the extension no longer writes to a project's `.vscode/settings.json` — which is usually tracked by git — just by being installed. Set it back to `workspace` to scope hiding to a single project.
- Entries written to the previous target under 0.1.0 are cleaned up automatically on upgrade.

## 0.1.0

- Initial release: hide files matching a list of globs, with command palette and status bar toggles.
