import * as vscode from 'vscode';

const SECTION = 'hideFiles';
const EXCLUDE_KEY = 'files.exclude';

/** Whether hiding is currently on. Remembered per workspace. */
const HIDDEN_STATE = 'hideFiles.hidden';
/**
 * The `files.exclude` entries this extension added, mapped to whatever was
 * there before (`null` when the key was absent), so showing files again puts
 * the user's own settings back exactly as they were.
 */
const MANAGED_STATE = 'hideFiles.managed';

type ExcludeValue = boolean | { when?: string };
type ExcludeMap = Record<string, ExcludeValue>;
type ManagedMap = Record<string, ExcludeValue | null>;

let statusBarItem: vscode.StatusBarItem;

function config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(SECTION);
}

function patterns(): string[] {
    const raw = config().get<string[]>('patterns', []) ?? [];
    const cleaned = raw
        .filter((pattern): pattern is string => typeof pattern === 'string')
        .map(pattern => pattern.trim())
        .filter(pattern => pattern.length > 0);
    return [...new Set(cleaned)];
}

function target(): vscode.ConfigurationTarget {
    const hasFolder = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
    const preferred = config().get<string>('configurationTarget', 'workspace');
    if (preferred === 'global' || !hasFolder) {
        return vscode.ConfigurationTarget.Global;
    }
    return vscode.ConfigurationTarget.Workspace;
}

/** Managed entries live alongside the settings they describe: global target, global state. */
function managedStore(context: vscode.ExtensionContext, to: vscode.ConfigurationTarget): vscode.Memento {
    return to === vscode.ConfigurationTarget.Global ? context.globalState : context.workspaceState;
}

function readManaged(context: vscode.ExtensionContext, to: vscode.ConfigurationTarget): ManagedMap {
    return { ...(managedStore(context, to).get<ManagedMap>(MANAGED_STATE) ?? {}) };
}

function readExclude(to: vscode.ConfigurationTarget): ExcludeMap {
    const inspected = vscode.workspace.getConfiguration().inspect<ExcludeMap>(EXCLUDE_KEY);
    const value = to === vscode.ConfigurationTarget.Global ? inspected?.globalValue : inspected?.workspaceValue;
    return { ...(value ?? {}) };
}

async function writeExclude(to: vscode.ConfigurationTarget, exclude: ExcludeMap): Promise<void> {
    const value = Object.keys(exclude).length > 0 ? exclude : undefined;
    await vscode.workspace.getConfiguration().update(EXCLUDE_KEY, value, to);
}

function isHidden(context: vscode.ExtensionContext): boolean {
    return context.workspaceState.get<boolean>(HIDDEN_STATE) ?? config().get<boolean>('hiddenByDefault', true);
}

/**
 * Bring `files.exclude` in line with `hidden` and the configured patterns,
 * touching only the entries we put there ourselves.
 */
async function apply(context: vscode.ExtensionContext, hidden: boolean): Promise<void> {
    const to = target();
    await restoreOtherTarget(context, to);

    const wanted = hidden ? patterns() : [];
    const managed = readManaged(context, to);
    const exclude = readExclude(to);

    for (const [pattern, previous] of Object.entries(managed)) {
        if (wanted.includes(pattern)) {
            continue;
        }
        if (previous === null) {
            delete exclude[pattern];
        } else {
            exclude[pattern] = previous;
        }
        delete managed[pattern];
    }

    for (const pattern of wanted) {
        if (pattern in managed) {
            exclude[pattern] = true;
            continue;
        }
        if (exclude[pattern] === true) {
            // Already hidden by the user — leave it out of our bookkeeping so we never remove it.
            continue;
        }
        managed[pattern] = pattern in exclude ? exclude[pattern] : null;
        exclude[pattern] = true;
    }

    await writeExclude(to, exclude);
    await managedStore(context, to).update(MANAGED_STATE, managed);
    await context.workspaceState.update(HIDDEN_STATE, hidden);
    updateStatusBar(context);
}

/**
 * Clean up entries left in the target we are no longer writing to, which happens
 * when `hideFiles.configurationTarget` changes — possibly in an earlier session.
 */
async function restoreOtherTarget(context: vscode.ExtensionContext, to: vscode.ConfigurationTarget): Promise<void> {
    const other = to === vscode.ConfigurationTarget.Global
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
    if (other === vscode.ConfigurationTarget.Workspace && (vscode.workspace.workspaceFolders?.length ?? 0) === 0) {
        return;
    }
    await restore(context, other);
}

/** Undo every entry we added to `to`, leaving the user's own excludes untouched. */
async function restore(context: vscode.ExtensionContext, to: vscode.ConfigurationTarget): Promise<void> {
    const managed = readManaged(context, to);
    if (Object.keys(managed).length === 0) {
        return;
    }
    const exclude = readExclude(to);
    for (const [pattern, previous] of Object.entries(managed)) {
        if (previous === null) {
            delete exclude[pattern];
        } else {
            exclude[pattern] = previous;
        }
    }
    await writeExclude(to, exclude);
    await managedStore(context, to).update(MANAGED_STATE, {});
}

function updateStatusBar(context: vscode.ExtensionContext): void {
    if (!config().get<boolean>('showStatusBarItem', true) || patterns().length === 0) {
        statusBarItem.hide();
        return;
    }
    const hidden = isHidden(context);
    const count = patterns().length;
    statusBarItem.text = hidden ? '$(eye-closed) Files Hidden' : '$(eye) Files Shown';
    statusBarItem.tooltip = `Hide Files: ${count} pattern${count === 1 ? '' : 's'} — click to ${hidden ? 'show' : 'hide'}`;
    statusBarItem.show();
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'hideFiles.toggle';
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.commands.registerCommand('hideFiles.toggle', async () => {
            const hidden = !isHidden(context);
            if (hidden && patterns().length === 0) {
                await promptForPatterns();
                return;
            }
            await apply(context, hidden);
        }),
        vscode.commands.registerCommand('hideFiles.hide', async () => {
            if (patterns().length === 0) {
                await promptForPatterns();
                return;
            }
            await apply(context, true);
        }),
        vscode.commands.registerCommand('hideFiles.show', () => apply(context, false)),
        vscode.commands.registerCommand('hideFiles.editPatterns', () =>
            vscode.commands.executeCommand('workbench.action.openSettings', `${SECTION}.patterns`)
        )
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async event => {
            if (!event.affectsConfiguration(SECTION)) {
                return;
            }
            await apply(context, isHidden(context));
        })
    );

    await apply(context, isHidden(context));
}

async function promptForPatterns(): Promise<void> {
    const edit = 'Edit Patterns';
    const choice = await vscode.window.showInformationMessage(
        'Hide Files has no patterns configured yet.',
        edit
    );
    if (choice === edit) {
        await vscode.commands.executeCommand('workbench.action.openSettings', `${SECTION}.patterns`);
    }
}

export function deactivate(): void {
    // `files.exclude` entries are intentionally left in place so the hidden state
    // survives a reload; `Hide Files: Show Matching Files` removes them.
}
