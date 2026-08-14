import * as vscode from 'vscode';
import { VariableRegistry } from './variableRegistry';
import { closestMatches } from './textDistance';
import { DIAGNOSTIC_SOURCE } from './tokenDiagnostics';

export class TokenCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  constructor(private readonly registry: VariableRegistry) {}

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const knownNames = this.registry.getAllTokenNames();
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== DIAGNOSTIC_SOURCE || typeof diagnostic.code !== 'string') {
        continue;
      }

      for (const match of closestMatches(diagnostic.code, knownNames, 3)) {
        const action = new vscode.CodeAction(`Change to ${match}`, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, diagnostic.range, match);
        actions.push(action);
      }
    }

    return actions;
  }
}
