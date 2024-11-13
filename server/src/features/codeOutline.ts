import { DocumentSymbol, SymbolKind, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { tokenLegend, tokenTypes } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsManager';

export function generateCodeOutline(doc: TextDocument, connection: Connection): DocumentSymbol[] {
    const settings = getSettings(); // Retrieve outline settings
    const tokens = getDocumentTokens(doc.uri);
    
    if (settings.debug) {
        connection.console.log(`Settings: ${JSON.stringify(settings)}`);
        connection.console.log(`Tokens received: ${JSON.stringify(tokens)}`);
    }

    if (!tokens) {
        return []; // Return empty if no tokens available
    }

    const symbols: DocumentSymbol[] = [];

    tokens.data.forEach((_, i) => {
        const line = tokens.data[i * 5];
        const startChar = tokens.data[i * 5 + 1];
        const length = tokens.data[i * 5 + 2];
        const tokenIndex = tokens.data[i * 5 + 3];

        // Translate token index to token type string
        const tokenType = tokenLegend.tokenTypes[tokenIndex];

        let kind: SymbolKind | undefined;
        if (settings.enableClassOutline && tokenType === tokenTypes.class) {
            kind = SymbolKind.Class;
        } else if (settings.enableMethodOutline && tokenType === tokenTypes.method) {
            kind = SymbolKind.Method;
        } else if (settings.enableFieldOutline && tokenType === tokenTypes.field) {
            kind = SymbolKind.Field;
        }

        if (kind) {
            symbols.push({
                name: tokenType, // Use the token type as the name for simplicity
                kind,
                range: {
                    start: { line, character: startChar },
                    end: { line, character: startChar + length }
                },
                selectionRange: {
                    start: { line, character: startChar },
                    end: { line, character: startChar + length }
                }
            });

            if (settings.debug) {
                connection.console.log(`Added symbol: ${symbols[symbols.length - 1].name}`);
            }
        }
    });

    connection.console.log(`-generated code outline for document: ${doc.uri.split('/').pop()}`);
    return symbols;
}
