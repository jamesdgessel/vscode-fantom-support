import { Diagnostic, DiagnosticSeverity, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getSettings } from '../utils/settingsManager';
import { fantomTokenRegex } from '../utils/tokenTypes';

// Lints the document for Fantom-specific issues and returns diagnostics
export function lintCode(doc: TextDocument, connection: Connection): Diagnostic[] {
    const settings = getSettings(); // Retrieve linting settings
    const diagnostics: Diagnostic[] = [];
    const text = doc.getText();
    const lines = text.split(/\r?\n/);

    lines.forEach((line, lineIndex) => {
        let match;

        // Check for naming conventions in variables if enabled in settings
        if (settings.checkVariableNaming) {
            while ((match = fantomTokenRegex.variablePattern.exec(line)) !== null) {
                const variableName = match[1];
                if (!/^[a-z][a-zA-Z0-9]*$/.test(variableName)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: lineIndex, character: match.index },
                            end: { line: lineIndex, character: match.index + variableName.length }
                        },
                        message: `Variable "${variableName}" does not follow naming conventions.`,
                        source: 'fantom-linter'
                    });
                }
            }
        }
    });

    // Send diagnostics to the client
    connection.sendDiagnostics({ uri: doc.uri, diagnostics });
    return diagnostics;
}
