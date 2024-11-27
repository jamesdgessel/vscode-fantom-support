import { Diagnostic, DiagnosticSeverity, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getSettings } from '../config/settingsHandler';
import { fantomTokenRegex } from '../config/tokenTypes';
import { logMessage } from '../utils/notify';

// Lints the document for Fantom-specific issues and returns diagnostics
export function lintCode(doc: TextDocument, connection: Connection): Diagnostic[] {

    logMessage('info', 'Linting document for Fantom-specific issues', '[LINTER]', connection)

    const settings = getSettings(); // Retrieve linting settings
    const diagnostics: Diagnostic[] = [];
    const text = doc.getText();
    const lines = text.split(/\r?\n/);

    lines.forEach((line, lineIndex) => {
        let match;

        // Check for naming conventions in variables if enabled in settings
        // if (settings.linting.checkVariableNaming) {
        //     while ((match = fantomTokenRegex.variablePattern.exec(line)) !== null) {
        //         const variableName = match[1];
        //         if (!/^[a-z][a-zA-Z0-9]*$/.test(variableName)) {
        //             diagnostics.push({
        //                 severity: DiagnosticSeverity.Warning,
        //                 range: {
        //                     start: { line: lineIndex, character: match.index },
        //                     end: { line: lineIndex, character: match.index + variableName.length }
        //                 },
        //                 message: `Variable "${variableName}" does not follow naming conventions.`,
        //                 source: 'fantom-linter'
        //             });
        //         }
        //     }
        // }
    });

    // Send diagnostics to the client
    connection.sendDiagnostics({ uri: doc.uri, diagnostics });
    return diagnostics;
}
