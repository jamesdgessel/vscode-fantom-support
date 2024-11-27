import { Range, Position, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { exec, execFile } from 'child_process';
import * as path from "path";
import { logMessage } from './notify';
import * as fs from 'fs';
import { WorkspaceFolder } from 'vscode-languageserver';

// Regular expressions to match string literals
export const stringPatterns: RegExp[] = [
    /"([^"\\]|\\.)*"/g,
    /'([^'\\]|\\.)*'/g
];

/**
 * Finds all string literal ranges in the document.
 */
export function findStringRanges(text: string, document: TextDocument): Range[] {
    const ranges: Range[] = [];
    stringPatterns.forEach(pattern => {
        let match: RegExpExecArray | null;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(text)) !== null) {
            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);
            ranges.push(Range.create(start, end));
        }
    });
    return ranges;
}

/**
 * Checks if a given position is within any of the specified ranges.
 */
export function isPositionInRanges(position: Position, ranges: Range[]): boolean {
    return ranges.some(range => isPositionWithinRange(position, range));
}

/**
 * Determines if a position is within a specific range.
 */
export function isPositionWithinRange(position: Position, range: Range): boolean {
    if (position.line < range.start.line || position.line > range.end.line) {return false;}
    if (position.line === range.start.line && position.character < range.start.character) {return false;}
    if (position.line === range.end.line && position.character > range.end.character) {return false;}
    return true;
}

/**
 * Helper function to get the range of the word at a given position.
 */
export function getWordRangeAtPosition(document: TextDocument, position: Position): Range | null {
    const text = document.getText();
    const offset = document.offsetAt(position);
    if (offset >= text.length) {return null;}

    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])){ start--;}
    let end = offset;
    while (end < text.length && /\w/.test(text[end])) {end++;}

    return Range.create(document.positionAt(start), document.positionAt(end));
}

/**
 * Escapes special characters in a string for use in a regular expression.
 */
export function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Retrieves the document name from its URI.
 */
export function getDocumentName(uri: string): string {
    return uri.split('/').pop() || uri;
}

/**
 * Returns markdown code block for a given string.
 */
export function generateMarkdownForHover(content: string): string {
    return '```plaintext\n' + content + '\n```';
}

/**
 * Executes a shell command and returns the output as a Promise.
 * @param command The command to execute.
 * @returns A Promise that resolves to the command output, or rejects with an error.
 */
export function runShellCmd(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing command: ${stderr || error.message}`);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

export function getCallerFunctionName(level: number = 1): string | undefined {
    const error = new Error();
    const stack = error.stack?.split("\n");

    if (stack && stack.length > level + 1) {
        // Extract the desired stack line (level + 1, as the first line is "Error")
        const callerLine = stack[level + 1].trim();

        // Extract the function name using regex
        const match = callerLine.match(/at (\w+)/);
        return match ? match[1] : undefined;
    }

    return undefined;
}

/**
     * Utility method to read and parse a JSON file.
     */
export async function readJsonFile(filePath: string): Promise<object> {
    logMessage('info', `Reading JSON file: ${filePath}`, '[FANTOM]');
    if (!fs.existsSync(filePath)) {
        const errorMessage = `File not found: ${filePath}`;
        logMessage('err', errorMessage, '[FANTOM]');
        throw new Error(errorMessage);
    }
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(data);
        logMessage('info', `Successfully read and parsed JSON file: ${filePath}`, '[FANTOM]');
        return jsonData;
    } catch (error) {
        const errorMessage = `Error reading or parsing JSON file: ${filePath}. Error: ${(error as Error).message}`;
        logMessage('err', errorMessage, '[FANTOM]');
        throw new Error(errorMessage);
    }
}

export async function fetchWorkspaceFolders(connection: Connection): Promise<string[]> {
    const folders: WorkspaceFolder[] | null = await connection.workspace.getWorkspaceFolders();
  
    if (folders && folders.length > 0) {
      // Return an array of folder paths
      return folders.map((folder) => decodeURIComponent(folder.uri));
    }
  
    return [];
  }