import { SemanticTokens, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { tokenLegend, fantomTokenRegex, tokenTypes } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsManager';

// Global storage for tokens to allow other features to access pre-built tokens
const documentTokens = new Map<string, SemanticTokens>();

// Main function to build and store tokens
export function buildSemanticTokens(doc: TextDocument, connection: Connection): SemanticTokens {

    const settings = getSettings();
    const text = doc.getText();
    const tokensBuilder = new InlineSemanticTokensBuilder();

    if (settings.debug) {
        connection.console.log(` -building semantic tokens for  ${doc.uri.split('/').pop()}`);
    }

    const lines = text.split(/\r?\n/);
    lines.forEach((line, lineIndex) => {
        let match;

        // Match classes
        if ((match = fantomTokenRegex.classPattern.exec(line)) !== null) {
            tokensBuilder.push(lineIndex, match.index, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.class), 0);
            if (settings.debug) {
                // connection.console.log(`class: ${match[1]}: ${lineIndex}`);
            }
        }

        // Match methods
        while ((match = fantomTokenRegex.methodPattern.exec(line)) !== null) {
            tokensBuilder.push(lineIndex, match.index, match[2].length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
            if (settings.debug) {
                // connection.console.log(`method: ${match[2]}:${lineIndex}`);
            }
        }

        // Match fields
        while ((match = fantomTokenRegex.fieldPattern.exec(line)) !== null) {
            tokensBuilder.push(lineIndex, match.index, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.field), 0);
            if (settings.debug) {
                // connection.console.log(`field: ${match[1]}:${lineIndex}`);
            }
        }

        // Match variables
        while ((match = fantomTokenRegex.variablePattern.exec(line)) !== null) {
            tokensBuilder.push(lineIndex, match.index, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.field), 0);
            if (settings.debug) {
                // connection.console.log(`var: ${match[1]}:${lineIndex}`);
            }
        }
    });

    // Build tokens data; return empty tokens if no tokens were matched
    const tokens = tokensBuilder.build();
    const fileName = doc.uri.split('/').pop();
    if (tokens.data.length === 0) {
        if (settings.debug) {
            connection.console.log(`No tokens found for document: ${fileName}, returning empty tokens.`);
        }
        return { data: [] };
    }

    documentTokens.set(doc.uri, tokens);
    if (settings.debug) {
        connection.console.log(` -tokens built and stored for document: ${fileName}`);
    }
    return tokens;
}

// Retrieves pre-built tokens for other features
export function getDocumentTokens(uri: string): SemanticTokens | undefined {
    return documentTokens.get(uri);
}

// Clears stored tokens when a document is closed
export function clearDocumentTokens(uri: string): void {
    documentTokens.delete(uri);
}

// Inline builder class to manage token building
class InlineSemanticTokensBuilder {
    private data: number[] = [];

    // Adds a token entry
    push(line: number, startChar: number, length: number, tokenType: number, tokenModifiers: number) {
        this.data.push(line, startChar, length, tokenType, tokenModifiers);
    }

    // Builds the final SemanticTokens object
    build(): SemanticTokens {
        return { data: this.data };
    }
}

import { DocumentSymbol, Range, SymbolKind } from 'vscode-languageserver';

// Provide document symbols in the required format for onDocumentSymbol
export function provideDocumentSymbols(uri: string): DocumentSymbol[] | undefined {
    const tokens = getDocumentTokens(uri);
    if (!tokens) {return undefined;}

    // Map tokens to DocumentSymbol array
    const symbols: DocumentSymbol[] = [];
    for (let i = 0; i < tokens.data.length; i += 5) {
        const line = tokens.data[i];
        const startChar = tokens.data[i + 1];
        const length = tokens.data[i + 2];
        const tokenType = tokens.data[i + 3];

        const range = Range.create(line, startChar, line, startChar + length);
        let kind: SymbolKind;

        // Map token type to a SymbolKind
        switch (tokenType) {
            case tokenLegend.tokenTypes.indexOf(tokenTypes.class):
                kind = SymbolKind.Class;
                break;
            case tokenLegend.tokenTypes.indexOf(tokenTypes.method):
                kind = SymbolKind.Method;
                break;
            case tokenLegend.tokenTypes.indexOf(tokenTypes.field):
                kind = SymbolKind.Field;
                break;
            default:
                kind = SymbolKind.Variable;
        }

        symbols.push(DocumentSymbol.create(`Token ${i / 5}`, "", kind, range, range));
    }

    return symbols;
}
