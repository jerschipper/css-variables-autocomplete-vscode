import * as vscode from 'vscode';
import { VariableRegistry } from './variableRegistry';
import { usageAtOffset } from './tokenUsageLookup';

export class TokenDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly registry: VariableRegistry) {}

  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Location | undefined {
    const usage = usageAtOffset(document.getText(), document.offsetAt(position));
    if (!usage) {
      return undefined;
    }

    const location = this.registry.getDefinitionLocation(document.uri.toString(), usage.name);
    if (!location) {
      return undefined;
    }

    return new vscode.Location(
      vscode.Uri.parse(location.uri),
      new vscode.Position(location.entry.line, location.entry.column),
    );
  }
}
