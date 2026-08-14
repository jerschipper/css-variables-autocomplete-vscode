import * as vscode from 'vscode';
import { VariableRegistry } from './variableRegistry';
import { findTokenUsages } from './tokenUsageScanner';
import { usageAtOffset } from './tokenUsageLookup';

const DECLARATION_NAME = /--[\w-]+/g;

export class TokenRenameProvider implements vscode.RenameProvider {
  constructor(private readonly registry: VariableRegistry) {}

  prepareRename(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
    const name = tokenNameAt(document, position);
    return name ? name.range : undefined;
  }

  async provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
  ): Promise<vscode.WorkspaceEdit | undefined> {
    const target = tokenNameAt(document, position);
    if (!target || !/^[\w-]+$/.test(newName)) {
      return undefined;
    }

    const fullNewName = `--${newName}`;
    const edit = new vscode.WorkspaceEdit();

    for (const uri of this.registry.getAllIndexedFileUris()) {
      const fileDocument = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
      const text = fileDocument.getText();
      const ranges: vscode.Range[] = [];

      DECLARATION_NAME.lastIndex = 0;
      for (let match = DECLARATION_NAME.exec(text); match; match = DECLARATION_NAME.exec(text)) {
        if (match[0] === target.name) {
          ranges.push(new vscode.Range(fileDocument.positionAt(match.index), fileDocument.positionAt(match.index + match[0].length)));
        }
      }

      for (const usage of findTokenUsages(text)) {
        if (usage.name === target.name) {
          ranges.push(new vscode.Range(fileDocument.positionAt(usage.start), fileDocument.positionAt(usage.end)));
        }
      }

      for (const range of ranges) {
        edit.replace(fileDocument.uri, range, fullNewName);
      }
    }

    return edit;
  }
}

function tokenNameAt(document: vscode.TextDocument, position: vscode.Position): { name: string; range: vscode.Range } | undefined {
  const offset = document.offsetAt(position);
  const text = document.getText();

  const usage = usageAtOffset(text, offset);
  if (usage) {
    return {
      name: usage.name,
      range: new vscode.Range(document.positionAt(usage.start + 2), document.positionAt(usage.end)),
    };
  }

  const wordRange = document.getWordRangeAtPosition(position, DECLARATION_NAME);
  if (!wordRange) {
    return undefined;
  }

  const name = document.getText(wordRange);
  return {
    name,
    range: new vscode.Range(wordRange.start.translate(0, 2), wordRange.end),
  };
}
