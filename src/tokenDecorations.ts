import * as vscode from 'vscode';
import { VariableRegistry } from './variableRegistry';
import { findTokenUsages } from './tokenUsageScanner';
import { SAFE_COLOR } from './valueSafety';

const SUPPORTED_LANGUAGES = new Set(['css', 'scss', 'less']);

export class TokenDecorationManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly decorationTypesByColor = new Map<string, vscode.TextEditorDecorationType>();
  private enabled: boolean;

  constructor(private readonly registry: VariableRegistry, enabled: boolean) {
    this.enabled = enabled;
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.refreshVisibleEditors()),
      vscode.workspace.onDidChangeTextDocument((event) => this.refreshEditorsForDocument(event.document)),
    );
    this.refreshVisibleEditors();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.refreshVisibleEditors();
  }

  refreshVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.decorateEditor(editor);
    }
  }

  private refreshEditorsForDocument(document: vscode.TextDocument): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document === document) {
        this.decorateEditor(editor);
      }
    }
  }

  private decorateEditor(editor: vscode.TextEditor): void {
    if (!SUPPORTED_LANGUAGES.has(editor.document.languageId)) {
      return;
    }

    const rangesByColor = new Map<string, vscode.Range[]>();

    if (this.enabled) {
      const entriesByName = new Map(
        this.registry.getCompletionVariables(editor.document.uri.toString()).map((entry) => [entry.name, entry]),
      );
      const text = editor.document.getText();

      for (const usage of findTokenUsages(text)) {
        const entry = entriesByName.get(usage.name);
        if (!entry || entry.type !== 'color' || !SAFE_COLOR.test(entry.value)) {
          continue;
        }

        const range = new vscode.Range(
          editor.document.positionAt(usage.start),
          editor.document.positionAt(usage.end),
        );
        const ranges = rangesByColor.get(entry.value) ?? [];
        ranges.push(range);
        rangesByColor.set(entry.value, ranges);
      }
    }

    for (const [color, decorationType] of this.decorationTypesByColor) {
      editor.setDecorations(decorationType, rangesByColor.get(color) ?? []);
    }

    for (const [color, ranges] of rangesByColor) {
      if (!this.decorationTypesByColor.has(color)) {
        const decorationType = this.createDecorationType(color);
        this.decorationTypesByColor.set(color, decorationType);
        editor.setDecorations(decorationType, ranges);
      }
    }
  }

  private createDecorationType(color: string): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      before: {
        contentText: ' ',
        backgroundColor: color,
        border: '1px solid rgba(128, 128, 128, 0.6)',
        width: '0.8em',
        height: '0.8em',
        margin: '0 4px 0 0',
      },
    });
  }

  dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
    this.decorationTypesByColor.forEach((decorationType) => decorationType.dispose());
    this.decorationTypesByColor.clear();
  }
}
