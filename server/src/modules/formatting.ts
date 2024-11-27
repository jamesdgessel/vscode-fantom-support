import { TextEdit, TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentFormattingParams } from 'vscode-languageserver';
import { getSettings } from '../config/settingsHandler';
import { logMessage } from '../utils/notify';
import { connection } from '../server';

export function formatDocument(doc: TextDocument, params: DocumentFormattingParams): TextEdit[] {
  const module = '[FORMATTER]';
  logMessage('debug', 'Starting document formatting', module, connection, "start");

  const settings = getSettings();
  
  const text = doc.getText();
  const edits: TextEdit[] = [];

  const lines = text.split(/\r?\n/);
  logMessage('debug', `Processing ${lines.length} lines`, module, connection);

  const formattedLines = formatLines(lines);

  const formattedText = formattedLines.join('\n');
  if (formattedText !== text) {
    logMessage('debug', 'Applying changes', module, connection);
    edits.push({
      range: {
        start: doc.positionAt(0),
        end: doc.positionAt(text.length),
      },
      newText: formattedText,
    });
  } else {logMessage('debug', 'No changes required', module, connection);}

  logMessage('debug', 'Document formatting completed', module, connection, "end");
  return edits;
}

function formatLines(lines: string[]): string[] {
  const module = '[FORMATTER]';
  const formattedLines: string[] = [];
  let previousWasAnnotation = false;

  // Regex patterns to identify class and method definitions
  const classRegex = /^\s*class\s+\w+/;
  const methodRegex = /^\s*(public|private|protected)?\s*\w+(\<.*?\>)?\s+\w+\s*\([^)]*\)\s*\{/;

  // Count number of classes in the file
  const totalClasses = lines.filter(line => classRegex.test(line)).length;
  const multipleClasses = totalClasses > 1;

  logMessage('debug', `Total classes found: ${totalClasses}`, module, connection);

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    let line = originalLine.trim();

    // Preserve empty lines
    if (line === '') {
      formattedLines.push(originalLine);
      continue;
    }

    // Detect class definition
    const isClassDef = classRegex.test(line);
    if (isClassDef) {
      const classNameMatch = line.match(/class\s+(\w+)/);
      const className = classNameMatch ? classNameMatch[1] : 'NewClass';

      logMessage('debug', `Class definition found: ${className}`, module, connection, "loop");

      if (multipleClasses) {
        // Insert documentation above the class
        formattedLines.push('**************************************************************************');
        formattedLines.push(`** ${className}`);
        formattedLines.push('**************************************************************************');
      }
      formattedLines.push(originalLine);
      continue;
    }

    // Detect method definition
    const isMethodDef = methodRegex.test(line);
    if (isMethodDef) {
      const methodLineWithoutBrace = line.replace('{', '').trim();
      formattedLines.push(originalLine.replace(line, methodLineWithoutBrace));
      formattedLines.push(originalLine.replace(line, '{'));

      logMessage('debug', `Method definition found: ${line}`, module, connection, "loop");

      // Add documentation above method if missing
      const hasDoc = i > 0 && lines[i - 1].trim().startsWith('/**');
      if (!hasDoc) {
        logMessage('debug', `Adding documentation for method: ${line}`, module, connection, "loop");
        formattedLines.splice(formattedLines.length - 2, 0,
          originalLine.replace(line, '  /**'),
          originalLine.replace(line, '  * TODO: Add method documentation'),
          originalLine.replace(line, '  */')
        );
      }
      continue;
    }

    // Ensure exact indentation for other lines
    formattedLines.push(originalLine);
  }

  logMessage('debug', 'Line formatting completed', module, connection);
  return formattedLines;
}



