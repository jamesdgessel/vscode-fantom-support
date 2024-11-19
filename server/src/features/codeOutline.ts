import { DocumentSymbol, SymbolKind, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { tokenLegend, tokenTypes } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsManager';

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
    const debug = false; // Control logging for this file

    if (!tokens) {
        if (settings.debug && debug) {
            connection.console.log(`[OUTLINE] No tokens: ${doc.uri.split('/').pop()}`);
        }
        return [];
    }

    if (settings.debug && debug) {
        connection.console.log(`[OUTLINE] Start: ${doc.uri.split('/').pop()}`);
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
            if (settings.debug && debug) {
                connection.console.log(`[OUTLINE] Unknown token: ${tokenIndex}`);
            }
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
            if (settings.debug && debug) {
                connection.console.log(`[OUTLINE] No name at Line: ${line}, Char: ${startChar}`);
            }
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
                if (settings.debug) {
                    connection.console.log(`[OUTLINE] Unknown token type: ${tokenType}`);
                }
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
            if (settings.debug && debug) {
                connection.console.log(`[OUTLINE] Added: ${name.padEnd(20)}`);
            }
        } else if (kind === SymbolKind.Method || kind === SymbolKind.Field) {
            if (currentClass) {
                if (currentClass.children) {
                    currentClass.children.push(symbol);
                }
                currentClass.range.end = symbol.range.end;
                if (settings.debug && debug) {
                    connection.console.log(`[OUTLINE] Added: ${name.padEnd(20)} ${kind === SymbolKind.Method ? 'method' : 'field'}`);
                }
            } else {
                symbols.push(symbol); // Add to top-level if no parent class
                if (settings.debug && debug) {
                    connection.console.log(`[OUTLINE] Added: ${name.padEnd(20)} ${kind === SymbolKind.Method ? 'method' : 'field'} to top-level`);
                }
            }
        }
    }

    if (settings.debug && debug) {
        connection.console.log(`[OUTLINE] End: ${doc.uri.split('/').pop()}`);
        // connection.console.log(`${JSON.stringify(symbols)}`);
    }

    return symbols;
}

