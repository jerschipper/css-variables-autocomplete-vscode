export type VariableType = 'color' | 'typography' | 'spacing' | 'unknown';

export interface ParsedVariableEntry {
  name: string;
  value: string;
  type: VariableType;
  scope: string;
  file: string;
  line: number;
  column: number;
}

const TYPE_DETECTION_REGEX = {
  color: /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\(|(?:transparent|currentcolor)$)/i,
  typography: /(?:font-family|font-size|line-height|letter-spacing|font)/i,
  spacing: /^-?(?:\d+|\d*\.\d+)(?:px|rem|em|vh|vw|%|ch|vmin|vmax|ex|cm|mm|in|pt|pc)$/i,
};

const CSS_VARIABLE_DECLARATION = /(--[\w-]+)[ \t]*:[ \t]*([^;\r\n{}]+)[ \t]*;/g;

export function parseCssVariables(content: string, file: string): ParsedVariableEntry[] {
  const variables: ParsedVariableEntry[] = [];
  CSS_VARIABLE_DECLARATION.lastIndex = 0;

  for (let match = CSS_VARIABLE_DECLARATION.exec(content); match; match = CSS_VARIABLE_DECLARATION.exec(content)) {
    const name = match[1];
    const value = match[2].trim();

    if (!value) {
      continue;
    }

    const position = positionAt(content, match.index);

    variables.push({
      name,
      value,
      type: detectVariableType(name, value),
      scope: findScope(content, match.index),
      file,
      line: position.line,
      column: position.column,
    });
  }

  return variables;
}

function positionAt(content: string, offset: number): { line: number; column: number } {
  const precedingContent = content.slice(0, offset);
  const lastNewline = precedingContent.lastIndexOf('\n');
  const line = (precedingContent.match(/\n/g) ?? []).length;
  return { line, column: offset - lastNewline - 1 };
}

export function detectVariableType(name: string, value: string): VariableType {
  if (TYPE_DETECTION_REGEX.color.test(value) || /^var\(/i.test(value)) {
    return 'color';
  }

  if (TYPE_DETECTION_REGEX.typography.test(name) || TYPE_DETECTION_REGEX.typography.test(value)) {
    return 'typography';
  }

  if (TYPE_DETECTION_REGEX.spacing.test(value)) {
    return 'spacing';
  }

  return 'unknown';
}

function findScope(content: string, declarationOffset: number): string {
  const precedingContent = content.slice(0, declarationOffset);
  const blockStart = precedingContent.lastIndexOf('{');

  if (blockStart < 0) {
    return ':root';
  }

  const selectorStart = Math.max(precedingContent.lastIndexOf('}', blockStart), precedingContent.lastIndexOf('{', blockStart - 1));
  const selector = precedingContent.slice(selectorStart + 1, blockStart).trim();
  return selector || ':root';
}
