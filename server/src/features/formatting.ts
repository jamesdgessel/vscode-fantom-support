import { TextEdit, TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentFormattingParams } from 'vscode-languageserver';
import { getSettings } from '../utils/settingsManager';

export function formatDocument(doc: TextDocument, params: DocumentFormattingParams): TextEdit[] {
  const settings = getSettings(); // Retrieve formatting settings
  const text = doc.getText();
  const edits: TextEdit[] = [];

  // Split the document text into lines
  const lines = text.split(/\r?\n/);
  const formattedLines = formatLines(lines);

  // Join the formatted lines into the final text
  const formattedText = formattedLines.join('\n');

  // If the formatted text differs, return the edit to replace the entire document content
  if (formattedText !== text) {
    edits.push({
      range: {
        start: doc.positionAt(0),
        end: doc.positionAt(text.length),
      },
      newText: formattedText,
    });
  }

  return edits;
}

// Formats all lines of the document according to Fantom guidelines
function formatLines(lines: string[]): string[] {
  const formattedLines: string[] = [];
  const indentStack: number[] = [0]; // Tracks current indentation levels

  for (let line of lines) {
    // Trim trailing whitespace
    line = line.trimEnd();

    if (line === '') {
      formattedLines.push(line); // Preserve empty lines
      continue;
    }

    const currentIndent = indentStack[indentStack.length - 1];

    // Check for closing brace
    if (line.startsWith('}')) {
      indentStack.pop();
      formattedLines.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
      continue;
    }

    // Handle opening brace
    if (line.endsWith('{')) {
      formattedLines.push(' '.repeat(currentIndent) + line.trim());
      indentStack.push(currentIndent + 2);
      continue;
    }

    // Regular line with current indentation
    formattedLines.push(' '.repeat(currentIndent) + line);
  }

  return formattedLines;
}
