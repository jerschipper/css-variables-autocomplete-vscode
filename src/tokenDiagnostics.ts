import * as vscode from 'vscode';
import { VariableRegistry } from './variableRegistry';
import { findTokenUsages } from './tokenUsageScanner';

const SUPPORTED_LANGUAGES = new Set(['css', 'scss', 'less']);
export const DIAGNOSTIC_SOURCE = 'cssVariables';

export class TokenDiagnosticsManager implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('cssVariables');
  private readonly disposables: vscode.Disposable[] = [this.collection];
  private enabled: boolean;

  constructor(private readonly registry: VariableRegistry, enabled: boolean) {
    this.enabled = enabled;
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((document) => this.refreshDocument(document)),
      vscode.workspace.onDidChangeTextDocument((event) => this.refreshDocument(event.document)),
      vscode.workspace.onDidCloseTextDocument((document) => this.collection.delete(document.uri)),
    );
    for (const document of vscode.workspace.textDocuments) {
      this.refreshDocument(document);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    for (const document of vscode.workspace.textDocuments) {
      this.refreshDocument(document);
    }
  }

  refreshDocument(document: vscode.TextDocument): void {
    if (!SUPPORTED_LANGUAGES.has(document.languageId)) {
      return;
    }

    if (!this.enabled) {
      this.collection.delete(document.uri);
      return;
    }

    const knownNames = new Set(this.registry.getCompletionVariables(document.uri.toString()).map((entry) => entry.name));
    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    for (const usage of findTokenUsages(text)) {
      if (knownNames.has(usage.name)) {
        continue;
      }

      const range = new vscode.Range(document.positionAt(usage.start), document.positionAt(usage.end));
      const diagnostic = new vscode.Diagnostic(
        range,
        `Unknown CSS variable ${usage.name}`,
        vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = DIAGNOSTIC_SOURCE;
      diagnostic.code = usage.name;
      diagnostics.push(diagnostic);
    }

    this.collection.set(document.uri, diagnostics);
  }

  dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
  }
}
