// import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from 'vscode-languageserver';

// /**
//  * Validates naming conventions based on Fantom linting rules.
//  * @param document The TextDocument object.
//  */
// export function validateNamingConventions(document: TextDocument) {
//     const diagnostics: Diagnostic[] = [];
//     const text = document.getText();

//     const typePattern = /\bclass\s+([A-Z][a-zA-Z0-9]*)\b/g;
//     const slotPattern = /\b(?:const|field|method)\s+([a-z][a-zA-Z0-9]*)\b/g;

//     let match: RegExpExecArray | null;
//     while ((match = typePattern.exec(text)) !== null) {
//         const range = Range.create(
//             document.positionAt(match.index),
//             document.positionAt(match.index + match[1].length)
//         );
//         if (!/^[A-Z][a-zA-Z0-9]*$/.test(match[1])) {
//             diagnostics.push({
//                 severity: DiagnosticSeverity.Warning,
//                 range,
//                 message: `Type names should be UpperCamelCase.`,
//                 source: 'fantom-linter'
//             });
//         }
//     }

//     while ((match = slotPattern.exec(text)) !== null) {
//         const range = Range.create(
//             document.positionAt(match.index),
//             document.positionAt(match.index + match[1].length)
//         );
//         if (!/^[a-z][a-zA-Z0-9]*$/.test(match[1])) {
//             diagnostics.push({
//                 severity: DiagnosticSeverity.Warning,
//                 range,
//                 message: `Slot names should be lowerCamelCase.`,
//                 source: 'fantom-linter'
//             });
//         }
//     }

//     //documentDiagnostics.set(document.uri, diagnostics);
//     //connection.sendDiagnostics({ uri: document.uri, diagnostics });
// }