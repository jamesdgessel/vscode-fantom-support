// import { Range, Position } from 'vscode-languageserver';
// import { TextDocument } from 'vscode-languageserver-textdocument';
// import { exec, execFile } from 'child_process';
// import * as path from "path";

// // Regular expressions to match string literals
// export const stringPatterns: RegExp[] = [
//     /"([^"\\]|\\.)*"/g,
//     /'([^'\\]|\\.)*'/g
// ];

// /**
//  * Finds all string literal ranges in the document.
//  */
// export function findStringRanges(text: string, document: TextDocument): Range[] {
//     const ranges: Range[] = [];
//     stringPatterns.forEach(pattern => {
//         let match: RegExpExecArray | null;
//         pattern.lastIndex = 0;
//         while ((match = pattern.exec(text)) !== null) {
//             const start = document.positionAt(match.index);
//             const end = document.positionAt(match.index + match[0].length);
//             ranges.push(Range.create(start, end));
//         }
//     });
//     return ranges;
// }

// /**
//  * Checks if a given position is within any of the specified ranges.
//  */
// export function isPositionInRanges(position: Position, ranges: Range[]): boolean {
//     return ranges.some(range => isPositionWithinRange(position, range));
// }

// /**
//  * Determines if a position is within a specific range.
//  */
// export function isPositionWithinRange(position: Position, range: Range): boolean {
//     if (position.line < range.start.line || position.line > range.end.line) {return false;}
//     if (position.line === range.start.line && position.character < range.start.character) {return false;}
//     if (position.line === range.end.line && position.character > range.end.character) {return false;}
//     return true;
// }

// /**
//  * Helper function to get the range of the word at a given position.
//  */
// export function getWordRangeAtPosition(document: TextDocument, position: Position): Range | null {
//     const text = document.getText();
//     const offset = document.offsetAt(position);
//     if (offset >= text.length) {return null;}

//     let start = offset;
//     while (start > 0 && /\w/.test(text[start - 1])){ start--;}
//     let end = offset;
//     while (end < text.length && /\w/.test(text[end])) {end++;}

//     return Range.create(document.positionAt(start), document.positionAt(end));
// }

// /**
//  * Escapes special characters in a string for use in a regular expression.
//  */
// export function escapeRegExp(text: string): string {
//     return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

// /**
//  * Retrieves the document name from its URI.
//  */
// export function getDocumentName(uri: string): string {
//     return uri.split('/').pop() || uri;
// }

// /**
//  * Returns markdown code block for a given string.
//  */
// export function generateMarkdownForHover(content: string): string {
//     return '```plaintext\n' + content + '\n```';
// }

// /**
//  * Executes a shell command and returns the output as a Promise.
//  * @param command The command to execute.
//  * @returns A Promise that resolves to the command output, or rejects with an error.
//  */
// export function runShellCmd(command: string): Promise<string> {
//     return new Promise((resolve, reject) => {
//         exec(command, (error, stdout, stderr) => {
//             if (error) {
//                 reject(`Error executing command: ${stderr || error.message}`);
//                 return;
//             }
//             resolve(stdout.trim());
//         });
//     });
// }

// /**
//  * Executes a Fantom file with specified arguments.
//  * @param scriptName The name of the Fantom script file (e.g., "TypeSearcher.fan").
//  * @param args Arguments to pass to the Fantom script.
//  * @returns A Promise that resolves to the script's output, or rejects with an error.
//  */
// export function runFanFile(scriptName: string, args: string[]): Promise<string> {
//     return new Promise((resolve, reject) => {
//         const fantomExecutable = "fan"; // Ensure "fan" is in your system PATH
//         const fantomScriptPath = path.resolve(__dirname, "src/fantom", scriptName);

//         execFile(fantomExecutable, [fantomScriptPath, ...args], (error, stdout, stderr) => {
//             if (error) {
//                 reject(`Error executing Fantom script: ${stderr || error.message}`);
//                 return;
//             }
//             resolve(stdout.trim());
//         });
//     });
// }