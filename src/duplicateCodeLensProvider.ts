import * as vscode from 'vscode';
import { VariableRegistry } from './variableRegistry';

export class DuplicateDeclarationCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.onDidChangeEmitter.event;

  constructor(private readonly registry: VariableRegistry) {}

  refresh(): void {
    this.onDidChangeEmitter.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const documentUri = document.uri.toString();
    const lenses: vscode.CodeLens[] = [];

    for (const entry of this.registry.getVariablesForFile(documentUri)) {
      const duplicates = this.registry.getDuplicateDeclarations(entry.name, documentUri);
      if (duplicates.length === 0) {
        continue;
      }

      const range = new vscode.Range(entry.line, 0, entry.line, 0);
      const label = duplicates.length === 1
        ? 'Also defined in 1 other file'
        : `Also defined in ${duplicates.length} other files`;

      lenses.push(new vscode.CodeLens(range, {
        title: label,
        command: 'cssVariables.showDuplicates',
        arguments: [entry.name, duplicates.map((duplicate) => duplicate.uri)],
      }));
    }

    return lenses;
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }
}
