import * as vscode from 'vscode';
import { VariableRegistry } from './variableRegistry';
import { CompletionProvider } from './completionProvider';
import { PreviewPanel } from './previewPanel';
import { hasCompletedTriggerPrefix } from './suggestionTrigger';
import { TokenDecorationManager } from './tokenDecorations';
import { TokenHoverProvider } from './hoverProvider';
import { TokenDefinitionProvider } from './definitionProvider';
import { DuplicateDeclarationCodeLensProvider } from './duplicateCodeLensProvider';
import { TokenDiagnosticsManager } from './tokenDiagnostics';
import { TokenCodeActionProvider } from './tokenCodeActions';
import { TokenDashboardPanel } from './tokenDashboardPanel';
import { TokenRenameProvider } from './renameProvider';

const SUPPORTED_LANGUAGES = ['css', 'scss', 'less'];

export function activate(context: vscode.ExtensionContext) {
  const configuration = readConfiguration();
  const registry = new VariableRegistry(configuration);
  context.subscriptions.push(registry);

  const provider = new CompletionProvider(registry, configuration);
  let completionRegistrations = registerCompletionProvider(provider, configuration.triggerPrefix);
  context.subscriptions.push(...completionRegistrations);
  let triggerPrefix = configuration.triggerPrefix;

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document !== event.document || event.contentChanges.length === 0) {
        return;
      }

      const beforeCursor = editor.document.lineAt(editor.selection.active.line).text
        .slice(0, editor.selection.active.character);
      if (hasCompletedTriggerPrefix(beforeCursor, triggerPrefix)) {
        void vscode.commands.executeCommand('editor.action.triggerSuggest');
      }
    }),
  );

  const previewCmd = vscode.commands.registerCommand('cssVariables.showPreview', (arg: unknown) => {
    if (!vscode.workspace.getConfiguration('cssVariables').get<boolean>('preview.enabled', true)) return;
    PreviewPanel.show(arg);
  });
  context.subscriptions.push(previewCmd);

  const decorationManager = new TokenDecorationManager(registry, readDecorationsEnabled());
  context.subscriptions.push(decorationManager);

  const insertTokenCmd = vscode.commands.registerCommand('cssVariables.insertToken', async () => {
    await insertToken(registry);
  });
  context.subscriptions.push(insertTokenCmd);

  context.subscriptions.push(vscode.languages.registerHoverProvider(SUPPORTED_LANGUAGES, new TokenHoverProvider(registry)));
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(SUPPORTED_LANGUAGES, new TokenDefinitionProvider(registry)));
  context.subscriptions.push(vscode.languages.registerRenameProvider(SUPPORTED_LANGUAGES, new TokenRenameProvider(registry)));

  const duplicateLensProvider = new DuplicateDeclarationCodeLensProvider(registry);
  context.subscriptions.push(vscode.languages.registerCodeLensProvider(SUPPORTED_LANGUAGES, duplicateLensProvider));
  context.subscriptions.push(duplicateLensProvider);

  context.subscriptions.push(vscode.commands.registerCommand(
    'cssVariables.showDuplicates',
    async (name: string, uris: string[]) => showDuplicates(name, uris),
  ));

  const diagnosticsManager = new TokenDiagnosticsManager(registry, readDiagnosticsEnabled());
  context.subscriptions.push(diagnosticsManager);
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider(
    SUPPORTED_LANGUAGES,
    new TokenCodeActionProvider(registry),
    { providedCodeActionKinds: TokenCodeActionProvider.providedCodeActionKinds },
  ));

  context.subscriptions.push(vscode.commands.registerCommand('cssVariables.showDashboard', () => {
    TokenDashboardPanel.show(registry);
  }));

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('cssVariables')) {
        const updatedConfiguration = readConfiguration();
        registry.updateConfiguration(updatedConfiguration);
        provider.updateConfiguration(updatedConfiguration);
        triggerPrefix = updatedConfiguration.triggerPrefix;
        completionRegistrations.forEach((registration) => registration.dispose());
        completionRegistrations = registerCompletionProvider(provider, updatedConfiguration.triggerPrefix);
        context.subscriptions.push(...completionRegistrations);
        decorationManager.setEnabled(readDecorationsEnabled());
        diagnosticsManager.setEnabled(readDiagnosticsEnabled());
        duplicateLensProvider.refresh();
      }
    })
  );
}

async function showDuplicates(name: string, uris: string[]): Promise<void> {
  const picked = await vscode.window.showQuickPick(
    uris.map((uri) => ({ label: vscode.workspace.asRelativePath(vscode.Uri.parse(uri)), uri })),
    { placeHolder: `Other files declaring ${name}` },
  );

  if (picked) {
    await vscode.window.showTextDocument(vscode.Uri.parse(picked.uri));
  }
}

function readDiagnosticsEnabled(): boolean {
  return vscode.workspace.getConfiguration('cssVariables').get<boolean>('diagnostics.enabled', true);
}

async function insertToken(registry: VariableRegistry): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const entries = registry.getCompletionVariables(editor.document.uri.toString());
  const picked = await vscode.window.showQuickPick(
    entries.map((entry) => ({
      label: entry.name,
      description: entry.value,
      detail: `${entry.type} · ${entry.file}`,
    })),
    { placeHolder: 'Select a CSS custom property to insert', matchOnDescription: true },
  );

  if (!picked) {
    return;
  }

  await editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, `var(${picked.label})`);
  });
}

function readDecorationsEnabled(): boolean {
  return vscode.workspace.getConfiguration('cssVariables').get<boolean>('decorations.enabled', true);
}

export function deactivate() {}

function readConfiguration() {
  const scopes = vscode.workspace.getConfiguration('cssVariables.scopes');
  return {
    include: scopes.get<string[]>('include', ['**/*.css', '**/*.scss', '**/*.less']),
    exclude: scopes.get<string[]>('exclude', ['node_modules/**', '.git/**']),
    triggerPrefix: vscode.workspace.getConfiguration('cssVariables').get<string>('triggerPrefix', 'var(--'),
  };
}

function registerCompletionProvider(
  provider: CompletionProvider,
  triggerPrefix: string,
): vscode.Disposable[] {
  const triggerCharacters = [...new Set(['-', '(', triggerPrefix.at(-1)].filter((character): character is string => Boolean(character)))];
  return ['css', 'scss', 'less'].map((language) =>
    vscode.languages.registerCompletionItemProvider(language, provider, ...triggerCharacters),
  );
}
