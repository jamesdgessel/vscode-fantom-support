import { TextEdit, TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentFormattingParams } from 'vscode-languageserver';
import { getSettings } from '../utils/settingsManager';

export function formatDocument(doc: TextDocument, params: DocumentFormattingParams): TextEdit[] {
    const settings = getSettings(); // Retrieve formatting settings
    const text = doc.getText();
    const edits: TextEdit[] = [];

    // Convert code to a list of lines for line-by-line formatting
    const lines = text.split(/\r?\n/);
    const formattedLines = lines.map(line => formatLine(line, settings));

    // If the formatted text differs, return the edit to replace the entire document content
    const formattedText = formattedLines.join('\n');
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

// Helper function to format individual lines based on Fantom conventions and settings
function formatLine(line: string, settings: any): string {
    // Trim extra whitespace if enabled in settings
    let formattedLine = settings.trimWhitespace ? line.trim() : line;

    // Add indentation after opening braces if enabled
    if (settings.indentAfterBrace && formattedLine.endsWith("{")) {
        formattedLine += "\n    "; // Adds a new line and indentation after opening brace
    }

    // Ensure closing braces are on a new line if enabled
    if (settings.newLineBeforeClosingBrace && formattedLine === "}") {
        formattedLine = "\n" + formattedLine;
    }

    // Additional formatting rules based on settings
    if (settings.insertSemicolons && !formattedLine.endsWith(";") && formattedLine !== "}") {
        formattedLine += ";";
    }

    return formattedLine;
}
