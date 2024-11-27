import { DocumentSymbol, SymbolKind, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { tokenLegend, tokenTypes } from '../config/tokenTypes';
import { getSettings } from '../config/settingsHandler';
import { logMessage } from '../utils/notify';

/**
 * Builds a hierarchical code outline for a given document using semantic tokens.
 *
 * @param doc - The text document to analyze.
 * @param connection - The LSP connection for logging.
 * @returns An array of DocumentSymbols representing the code outline.
 */
export function buildOutline(doc: TextDocument, connection: Connection): DocumentSymbol[] {
    const settings = getSettings();
    const tokens = getDocumentTokens(doc.uri);
    const module = '[OUTLINE]';

    logMessage('debug', 'Building outline', module, connection, "start")


    if (!tokens) {
        logMessage('warn', `No tokens: ${doc.uri.split('/').pop()}`, module, connection);
        return [];
    }

    const symbols: DocumentSymbol[] = [];
    let currentClass: DocumentSymbol | null = null;

    for (let i = 0; i < tokens.data.length; i += 5) {
        const line = tokens.data[i];
        const startChar = tokens.data[i + 1];
        const length = tokens.data[i + 2];
        const tokenIndex = tokens.data[i + 3];

        const tokenType = tokenLegend.tokenTypes[tokenIndex];
        if (!tokenType) {
            logMessage('warn', `Unknown token: ${tokenIndex}`, module, connection);
            continue;
        }

        // Extract name and detail text
        const preText = doc.getText({
            start: { line, character: 0 },
            end: { line, character: startChar },
        }).trim();
        
        const words: string[] = preText.split(/\s+/); // Split by spaces or other whitespace
        const capitalWords: string[] = [];
        const otherWords: string[] = [];
        
        words.forEach((word: string) => {
            if (/^[A-Z]/.test(word)) {
                capitalWords.push(word);
            } else {
                otherWords.push(word);
            }
        });
        
        const formattedText: string = `${capitalWords.join(' ')} | ${otherWords.join(' ')}`;
             

        const name = doc.getText({
            start: { line, character: startChar },
            end: { line, character: startChar + length },
        }).trim();

        if (!name) {
            logMessage('warn', `No name at Line: ${line}, Char: ${startChar}`, module, connection);
            continue;
        }

        let kind: SymbolKind | undefined;
        switch (tokenType) {
            case tokenTypes.class:
                kind = SymbolKind.Class;
                break;
            case tokenTypes.method:
                kind = SymbolKind.Method;
                break;
            case tokenTypes.field:
                kind = SymbolKind.Field;
                break;
            default:
                logMessage('warn', `Unknown token type: ${tokenType}`, module, connection);
                break;
        }

        if (!kind) {continue;}

        const symbol: DocumentSymbol = {
            name,
            kind,
            range: {
                start: { line, character: startChar },
                end: { line, character: startChar + length },
            },
            selectionRange: {
                start: { line, character: startChar },
                end: { line, character: startChar + length },
            },
            children: [],
            detail: preText,

        };

        if (kind === SymbolKind.Class) {
            symbols.push(symbol);
            currentClass = symbol;
            logMessage('debug', `Added: ${name}`, module, connection, "loop");
        } else if (kind === SymbolKind.Method || kind === SymbolKind.Field) {
            if (currentClass) {
                if (currentClass.children) {
                    currentClass.children.push(symbol);
                }
                currentClass.range.end = symbol.range.end;
                logMessage('debug', `Added: ${name} ${kind === SymbolKind.Method ? 'method' : 'field'}`, module, connection, "loop");
            } else {
                symbols.push(symbol); // Add to top-level if no parent class
                logMessage('debug', `Added: ${name} ${kind === SymbolKind.Method ? 'method' : 'field'} to top-level`, module, connection, "loop");
            }
        }
    }

    logMessage('debug', `Complete: ${doc.uri.split('/').pop()}`, module, connection, "end");

    return symbols;
}

