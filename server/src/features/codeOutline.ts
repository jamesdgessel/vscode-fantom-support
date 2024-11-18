import { DocumentSymbol, SymbolKind, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { tokenLegend, tokenTypes } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsManager';

export function generateCodeOutline(doc: TextDocument, connection: Connection): DocumentSymbol[] {
    const settings = getSettings(); // Retrieve outline settings
    const tokens = getDocumentTokens(doc.uri);

    if (settings.debug) {
        connection.console.log(`[start] Tokens received, building outline`);
        if (tokens) {
            connection.console.log(` [TOKENS] ${JSON.stringify(tokens.data)}`);
        }
    }

    if (!tokens) {
        return []; // Return empty if no tokens available
    }

    const symbols: DocumentSymbol[] = [];
    let currentClass: DocumentSymbol | null = null; // Track the current class for nesting

    for (let i = 0; i < tokens.data.length; i += 5) {
        const line = tokens.data[i];
        const startChar = tokens.data[i + 1];
        const length = tokens.data[i + 2];
        const tokenIndex = tokens.data[i + 3];

        const tokenType = tokenLegend.tokenTypes[tokenIndex];
        const name = doc.getText({
            start: { line, character: startChar },
            end: { line, character: startChar + length },
        }).trim();

        let kind: SymbolKind | undefined;

        if (tokenType === tokenTypes.class) {
            kind = SymbolKind.Class;
        } else if (tokenType === tokenTypes.method) {
            kind = SymbolKind.Method;
        } else if (tokenType === tokenTypes.field) {
            kind = SymbolKind.Field;
        }

        if (!kind) {
            continue; // Skip unsupported token types
        }

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
        };

        if (kind === SymbolKind.Class) {
            // Add class to top-level symbols
            symbols.push(symbol);
            currentClass = symbol; // Set as the active class
            if (settings.debug) {
                connection.console.log(`Added class: ${name}`);
            }
        } else if (kind === SymbolKind.Method || kind === SymbolKind.Field) {
            if (currentClass) {
                if (!currentClass.children) {
                    currentClass.children = [];
                }
                currentClass.children.push(symbol);
                // Dynamically adjust the class range to include the child
                currentClass.range.end = symbol.range.end;
                if (settings.debug) {
                    connection.console.log(`  -added ${tokenType}: ${name} under class: ${currentClass.name}`);
                }
            } else if (settings.debug) {
                connection.console.log(`  -skipped ${tokenType}: ${name} (no parent class found)`);
            }
        }
    }

    connection.console.log(`[done] Generated code outline for document: ${doc.uri.split('/').pop()}`);
    return symbols;
}
