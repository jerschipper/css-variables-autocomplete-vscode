import * as vscode from 'vscode';
import { parseCssVariables, ParsedVariableEntry, VariableType } from './cssVariableParser';
import { effectiveExcludePatterns, matchesWorkspaceGlob, normalizeWorkspaceGlob } from './globPattern';

export type VariableEntry = ParsedVariableEntry;
export { VariableType } from './cssVariableParser';

export interface RegistryConfiguration {
  include: readonly string[];
  exclude: readonly string[];
}

const SUPPORTED_LANGUAGES = new Set(['css', 'scss', 'less']);
const DEBOUNCE_DELAY_MS = 150;

export class VariableRegistry implements vscode.Disposable {
  private readonly variablesByFile = new Map<string, Map<string, VariableEntry>>();
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly disposables: vscode.Disposable[] = [];
  private configuration: RegistryConfiguration;

  constructor(configuration: RegistryConfiguration) {
    this.configuration = normalizeConfiguration(configuration);
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => this.scheduleParse(event.document)),
      vscode.workspace.onDidOpenTextDocument((document) => this.parseDocument(document)),
      vscode.workspace.onDidCloseTextDocument((document) => void this.parseUri(document.uri)),
    );

    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{css,scss,less}');
    this.disposables.push(
      watcher,
      watcher.onDidCreate((uri) => void this.parseUri(uri)),
      watcher.onDidChange((uri) => void this.parseUri(uri)),
      watcher.onDidDelete((uri) => this.removeDocument(uri)),
    );

    for (const document of vscode.workspace.textDocuments) {
      this.parseDocument(document);
    }
    void this.refresh();
  }

  updateConfiguration(configuration: RegistryConfiguration): void {
    this.configuration = normalizeConfiguration(configuration);
    void this.refresh();
  }

  private scheduleParse(document: vscode.TextDocument): void {
    if (!this.shouldIndexDocument(document)) {
      return;
    }

    const key = document.uri.toString();
    const previousTimer = this.debounceTimers.get(key);
    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    this.debounceTimers.set(key, setTimeout(() => {
      this.debounceTimers.delete(key);
      this.parseDocument(document);
    }, DEBOUNCE_DELAY_MS));
  }

  private async parseUri(uri: vscode.Uri): Promise<void> {
    if (!this.shouldIndexUri(uri)) {
      this.removeDocument(uri);
      return;
    }

    try {
      this.parseDocument(await vscode.workspace.openTextDocument(uri));
    } catch {
      this.removeDocument(uri);
    }
  }

  private parseDocument(document: vscode.TextDocument): void {
    if (!this.shouldIndexDocument(document)) {
      this.removeDocument(document.uri);
      return;
    }

    const variables = new Map<string, VariableEntry>();
    for (const entry of parseCssVariables(document.getText(), document.fileName)) {
      variables.set(entry.name, entry);
    }

    this.variablesByFile.set(document.uri.toString(), variables);
  }

  private shouldIndexDocument(document: vscode.TextDocument): boolean {
    return SUPPORTED_LANGUAGES.has(document.languageId) && this.shouldIndexUri(document.uri);
  }

  private shouldIndexUri(uri: vscode.Uri): boolean {
    if (uri.scheme !== 'file' || !vscode.workspace.getWorkspaceFolder(uri)) {
      return false;
    }

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    return this.matchesAny(relativePath, this.configuration.include)
      && !this.matchesAny(relativePath, this.effectiveExcludes());
  }

  private matchesAny(relativePath: string, patterns: readonly string[]): boolean {
    return patterns.some((pattern) => matchesWorkspaceGlob(relativePath, pattern));
  }

  private removeDocument(uri: vscode.Uri): void {
    const key = uri.toString();
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
    this.variablesByFile.delete(key);
  }

  getVariablesForFile(fileUri: string): readonly VariableEntry[] {
    return [...(this.variablesByFile.get(fileUri)?.values() ?? [])];
  }

  getCompletionVariables(activeDocumentUri: string): readonly VariableEntry[] {
    const activeEntries = this.getVariablesForFile(activeDocumentUri);
    const activeNames = new Set(activeEntries.map((entry) => entry.name));
    const workspaceEntries = [...this.variablesByFile.entries()]
      .filter(([uri]) => uri !== activeDocumentUri)
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([, entries]) => [...entries.values()])
      .filter((entry) => !activeNames.has(entry.name));

    return [...activeEntries, ...workspaceEntries];
  }

  getDefinitionLocation(activeDocumentUri: string, name: string): { uri: string; entry: VariableEntry } | undefined {
    const preferred = this.getCompletionVariables(activeDocumentUri).find((entry) => entry.name === name);
    if (!preferred) {
      return undefined;
    }

    for (const [uri, entries] of this.variablesByFile) {
      if (entries.get(name) === preferred) {
        return { uri, entry: preferred };
      }
    }

    return undefined;
  }

  getDuplicateDeclarations(name: string, excludeUri: string): { uri: string; entry: VariableEntry }[] {
    return [...this.variablesByFile.entries()]
      .filter(([uri]) => uri !== excludeUri)
      .flatMap(([uri, entries]) => {
        const entry = entries.get(name);
        return entry ? [{ uri, entry }] : [];
      });
  }

  getAllTokenNames(): string[] {
    const names = new Set<string>();
    for (const entries of this.variablesByFile.values()) {
      for (const name of entries.keys()) {
        names.add(name);
      }
    }
    return [...names];
  }

  getAllIndexedFileUris(): string[] {
    return [...this.variablesByFile.keys()];
  }

  async refresh(): Promise<void> {
    this.variablesByFile.clear();

    const files = await Promise.all(this.configuration.include.map((include) =>
      vscode.workspace.findFiles(include, this.excludeGlob()),
    ));

    const uniqueUris = new Map<string, vscode.Uri>();
    for (const uri of files.flat()) {
      if (this.shouldIndexUri(uri)) {
        uniqueUris.set(uri.toString(), uri);
      }
    }

    await Promise.all([...uniqueUris.values()].map((uri) => this.parseUri(uri)));
  }

  private excludeGlob(): string | undefined {
    const excludes = this.effectiveExcludes();
    if (excludes.length === 0) {
      return undefined;
    }

    return excludes.length === 1
      ? excludes[0]
      : `{${excludes.join(',')}}`;
  }

  private effectiveExcludes(): readonly string[] {
    return effectiveExcludePatterns(this.configuration.include, this.configuration.exclude);
  }

  dispose(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.disposables.forEach((disposable) => disposable.dispose());
  }
}

function normalizeConfiguration(configuration: RegistryConfiguration): RegistryConfiguration {
  return {
    include: configuration.include.map(normalizeWorkspaceGlob),
    exclude: configuration.exclude.map(normalizeWorkspaceGlob),
  };
}
