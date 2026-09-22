# Hide Files

Hide any file matching a glob (or a list of globs), and toggle them back into view from the command palette.

Under the hood this manages entries in `files.exclude`, so hidden files disappear from the Explorer, quick open, and search — but only the entries Hide Files added are ever touched. Anything you put in `files.exclude` yourself is left alone, including when you toggle back.

## Configuration

```jsonc
{
  "hideFiles.patterns": [
    "**/*.lock",
    "**/*.generated.ts",
    "dist"
  ]
}
```

| Setting | Default | What it does |
| --- | --- | --- |
| `hideFiles.patterns` | `[]` | Globs to hide while hiding is on. Same syntax as `files.exclude`, matched relative to the workspace folder. |
| `hideFiles.hiddenByDefault` | `true` | Whether files start hidden the first time a workspace is opened. After that the toggle state is remembered per workspace. |
| `hideFiles.configurationTarget` | `"workspace"` | Where the generated `files.exclude` entries are written — `workspace` or `global`. Falls back to user settings when no folder is open. |
| `hideFiles.showStatusBarItem` | `true` | Show a status bar item indicating whether files are currently hidden. |

## Commands

| Command | Description |
| --- | --- |
| `Hide Files: Toggle Hidden Files` | Flip between hidden and visible. |
| `Hide Files: Hide Matching Files` | Hide, regardless of current state. |
| `Hide Files: Show Matching Files` | Show, regardless of current state. |
| `Hide Files: Edit Patterns` | Jump to the `hideFiles.patterns` setting. |

The status bar item (right side) shows the current state and toggles on click.

## Notes

- Editing `hideFiles.patterns` while files are hidden takes effect immediately — removed patterns are unexcluded, new ones are hidden.
- If a pattern is already set to `true` in your own `files.exclude`, Hide Files leaves it there and will not remove it when you toggle back.
- The hidden state persists across reloads. Uninstalling while hidden leaves the `files.exclude` entries behind; run `Hide Files: Show Matching Files` first to clean them up.

## Development

```sh
npm install
npm run watch   # then press F5 to launch the Extension Development Host
```
