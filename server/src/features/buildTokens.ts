import { SemanticTokens, Connection, DocumentSymbol, Range, SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { tokenLegend, fantomTokenRegex, tokenTypes } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsManager';
import { getCallerFunctionName } from '../utils/utils';
import { buildOutline } from './codeOutline';
import { TextDocuments } from 'vscode-languageserver';

// Global storage for tokens to allow other features to access pre-built tokens
const documentTokens = new Map<string, SemanticTokens>();

const debug = false; // Control logging for this file

// Main function to build and store tokens
export function buildSemanticTokens(doc: TextDocument, connection: Connection): SemanticTokens {
    const settings = getSettings();
    const text = doc.getText();
    const tokensBuilder = new InlineSemanticTokensBuilder();
    const scopeStack: { type: 'class' | 'method' | 'block'; lineStart: number }[] = [];

    if (settings.debug && debug) {
        connection.console.log(`[DEBUG] Building tokens for ${doc.uri.split('/').pop()}`);
    }

    const isInMethodScope = (line: number): boolean => {
        for (let i = scopeStack.length - 1; i >= 0; i--) {
            const scope = scopeStack[i];
            if (scope.type === 'method' && line >= scope.lineStart) {
                return true;
            }
            if (scope.type === 'class') {
                break; // Stop if we reach a class
            }
        }
        return false;
    };

    const lines = text.split(/\r?\n/);
    lines.forEach((line, lineIndex) => {
        let match;

        // Match classes
        if ((match = fantomTokenRegex.classPattern.exec(line)) !== null) {
            const captureIndex = match.index + match[0].indexOf(match[1]);
            if (settings.debug && debug) {
                connection.console.log(`[CLASS] ${match[1]} @ [${lineIndex + 1}, ${captureIndex}]`);
            }
            tokensBuilder.push(lineIndex, captureIndex, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.class), 0);
            scopeStack.push({ type: 'class', lineStart: lineIndex });

        }

        // Match constructor
        if ((match = /(?:new\s+)(make)/gm.exec(line)) !== null) {
            const captureIndex = match.index + match[0].indexOf(match[1]);
            if (settings.debug && debug) {
                connection.console.log(`[CONSTRUCTOR] ${match[1]} @ [${lineIndex + 1}, ${captureIndex}]`);
            }
            tokensBuilder.push(lineIndex, captureIndex, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
        }

        // Match methods
        while ((match = fantomTokenRegex.methodPattern.exec(line)) !== null) {
            const captureIndex = match.index + match[0].indexOf(match[1]);
            if (settings.debug && debug) {
                connection.console.log(`[METHOD] ${match[1]} @ [${lineIndex + 1}, ${captureIndex}]`);
            }
            tokensBuilder.push(lineIndex, captureIndex, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
            scopeStack.push({ type: 'method', lineStart: lineIndex });
        }

        // Match fields
        while ((match = fantomTokenRegex.fieldPattern.exec(line)) !== null) {
            const captureIndex = match.index + match[0].indexOf(match[1]);
            if (!isInMethodScope(lineIndex)) {
                if (settings.debug && debug) {
                    connection.console.log(`[FIELD] ${match[1]} @ [${lineIndex + 1}, ${captureIndex}]`);
                }
                tokensBuilder.push(lineIndex, captureIndex, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.field), 0);
            }
        }

        // Handle opening and closing braces
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;

        for (let i = 0; i < openBraces; i++) {
            scopeStack.push({ type: 'block', lineStart: lineIndex });
        }

        for (let i = 0; i < closeBraces; i++) {
            scopeStack.pop();
        }
    });

    const tokens = tokensBuilder.build();
    if (tokens.data.length === 0) {
        if (settings.debug && debug) {
            connection.console.log(`No tokens found for document: ${doc.uri.split('/').pop()}, returning empty tokens.`);
        }
        return { data: [] };
    }

    if (settings.debug && debug) {
        connection.console.log(`[DEBUG] Tokens built for ${doc.uri.split('/').pop()}`);
    }
    // connection.console.log(`[DEBUG] Semantic Tokens: ${JSON.stringify(tokens)}`);

    documentTokens.set(doc.uri, tokens);
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

    push(line: number, startChar: number, length: number, tokenType: number, tokenModifiers: number) {
        this.data.push(line, startChar, length, tokenType, tokenModifiers);
    }

    build(): SemanticTokens {
        return { data: this.data };
    }
}

// Provide document symbols in the required format for onDocumentSymbol
export function provideDocumentSymbols(uri: string, connection: Connection, documents: TextDocuments<TextDocument>): DocumentSymbol[] | undefined {
    const settings = getSettings();
    const doc = documents.get(uri);

    if (!doc) {
        if (settings.debug && debug) {
            connection.console.log(`[ERROR] Document not found: ${uri}`);
        }
        return undefined;
    }

    if (settings.debug && debug) {
        connection.console.log(`[DEBUG] Requesting doc symbols for ${uri.split('/').pop()}`);
    }

    const symbols = buildOutline(doc, connection);

    if (!symbols || symbols.length === 0) {
        if (settings.debug && debug) {
            connection.console.log(`[DEBUG] No symbols generated for ${uri.split('/').pop()}`);
        }
        return undefined;
    }

    if (settings.debug && debug) {
        connection.console.log(`[DEBUG] Generated symbols for ${uri.split('/').pop()}`);
    }

    return symbols;
}

