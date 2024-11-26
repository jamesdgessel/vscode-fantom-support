import { SemanticTokens, Connection, DocumentSymbol, Range, SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { tokenLegend, fantomTokenRegex, tokenTypes } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsHandler';
import { buildOutline } from './codeOutline';
import { TextDocuments } from 'vscode-languageserver';
import { logMessage } from '../utils/notify';

// Global storage for tokens to allow other features to access pre-built tokens
const documentTokens = new Map<string, SemanticTokens>();

// Main function to build and store tokens
export function buildSemanticTokens(doc: TextDocument, connection: Connection): SemanticTokens {
    const module = '[SEM TOK]';
    const settings = getSettings();
    const text = doc.getText();
    const tokensBuilder = new InlineSemanticTokensBuilder();
    const scopeStack: { type: 'class' | 'method' | 'block'; lineStart: number }[] = [];

    logMessage('debug', `Building tokens for ${doc.uri.split('/').pop()}`, module, connection);

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
            logMessage('debug', `class ${match[1]} @ [${lineIndex + 1}, ${captureIndex}]`, module, connection);
            tokensBuilder.push(lineIndex, captureIndex, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.class), 0);
            scopeStack.push({ type: 'class', lineStart: lineIndex });

        }

        // Match constructor
        if ((match = /(?:new\s+)(make)/gm.exec(line)) !== null) {
            const captureIndex = match.index + match[0].indexOf(match[1]);
            logMessage('debug', `make ${match[1]} @ [${lineIndex + 1}, ${captureIndex}]`, module, connection);
            tokensBuilder.push(lineIndex, captureIndex, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
        }

        // Match methods
        while ((match = fantomTokenRegex.methodPattern.exec(line)) !== null) {
            const captureIndex = match.index + match[0].indexOf(match[1]);
            logMessage('debug', `method ${match[1]} @ [${lineIndex + 1}, ${captureIndex}]`, module, connection);
            tokensBuilder.push(lineIndex, captureIndex, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
            scopeStack.push({ type: 'method', lineStart: lineIndex });
        }

        // Match fields
        while ((match = fantomTokenRegex.fieldPattern.exec(line)) !== null) {
            const captureIndex = match.index + match[0].indexOf(match[1]);
            if (!isInMethodScope(lineIndex)) {
                logMessage('debug', `field ${match[1]} @ [${lineIndex + 1}, ${captureIndex}]`, module, connection);
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
        logMessage('warn', `No tokens found for document: ${doc.uri.split('/').pop()}, returning empty tokens.`, module, connection);
        return { data: [] };
    }

    logMessage('info', `Tokens built for ${doc.uri.split('/').pop()}`, module, connection);
    // connection.console.log(`[DEBUG] SEM TOK: ${JSON.stringify(tokens)}`);

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
    const module = '[SYMB PROV]';
    const settings = getSettings();
    const doc = documents.get(uri);

    if (!doc) {
        logMessage('err', `Document not found: ${uri}`, module, connection);
        return undefined;
    }

    logMessage('debug', `Requesting doc symbols for ${uri.split('/').pop()}`, module, connection, "start");

    const symbols = buildOutline(doc, connection);

    if (!symbols || symbols.length === 0) {
        logMessage('warn', `No symbols generated for ${uri.split('/').pop()}`, module, connection);
        return undefined;
    }

    logMessage('info', `[Generated symbols for ${uri.split('/').pop()}`, module, connection, "end");

    return symbols;
}

