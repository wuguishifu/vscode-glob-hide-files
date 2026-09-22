# Hide Files

Hide any file matching a glob (or a list of globs), and toggle them back into view from the command palette.

Under the hood this manages entries in `files.exclude`, so hidden files disappear from the Explorer, quick open, and search — but only the entries Hide Files added are ever touched. Anything you put in `files.exclude` yourself is left alone, including when you toggle back.

By default those entries go in your **user settings**, so nothing is written into the project and no git-tracked file changes. See [Where settings are written](#where-settings-are-written) if you want to scope hiding to a single project instead.

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
| `hideFiles.configurationTarget` | `"global"` | Where the generated `files.exclude` entries are written — `global` (user settings) or `workspace`. Falls back to user settings when no folder is open. |
| `hideFiles.showStatusBarItem` | `true` | Show a status bar item indicating whether files are currently hidden. |

## Commands

| Command | Description |
| --- | --- |
| `Hide Files: Toggle Hidden Files` | Flip between hidden and visible. |
| `Hide Files: Hide Matching Files` | Hide, regardless of current state. |
| `Hide Files: Show Matching Files` | Show, regardless of current state. |
| `Hide Files: Edit Patterns` | Jump to the `hideFiles.patterns` setting. |

The status bar item (right side) shows the current state and toggles on click.

## Where settings are written

`hideFiles.configurationTarget` controls which settings file the generated `files.exclude` entries land in.

**`global` (default)** — writes to your user settings. Nothing is written into the project, so opening a repo with this extension never produces a git diff. The tradeoff is that `files.exclude` is shared across windows: if two projects are open with different `hideFiles.patterns`, the most recently activated window wins and the other stops hiding until you toggle it again. Your own `files.exclude` entries are never damaged either way. If you use one set of patterns everywhere, put `hideFiles.patterns` in user settings too and this never comes up.

**`workspace`** — writes to the project's `.vscode/settings.json` (or the `.code-workspace` file), so hiding is scoped to that project and windows never interfere. Note that these files are usually tracked by git, so expect a diff; add `.vscode/settings.json` to `.gitignore` or `.git/info/exclude` if that's unwanted.

Switching between the two migrates cleanly — entries left in the old location are removed automatically, even if the switch happens across sessions.

## Notes

- Editing `hideFiles.patterns` while files are hidden takes effect immediately — removed patterns are unexcluded, new ones are hidden.
- If a pattern is already set to `true` in your own `files.exclude`, Hide Files leaves it there and will not remove it when you toggle back.
- The hidden state persists across reloads. Uninstalling while hidden leaves the `files.exclude` entries behind; run `Hide Files: Show Matching Files` first to clean them up.
- Running the extension from the Extension Development Host uses the same settings as a normal install, so the default `global` target keeps the folder you're testing against free of stray changes.

## Development

```sh
npm install
npm run watch   # then press F5 to launch the Extension Development Host
```
