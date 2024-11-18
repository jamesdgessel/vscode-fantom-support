import { SemanticTokens, Connection, DocumentSymbol, Range, SymbolKind } from 'vscode-languageserver';
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
    const scopeStack: { type: 'class' | 'method' | 'block'; lineStart: number }[] = [];

    if (settings.debug) {
        connection.console.log(` [start] Building semantic tokens for  ${doc.uri.split('/').pop()}`);
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
            if (settings.debug) {
                connection.console.log(`[CLASS]        ${match[1].padEnd(20)} @ [${lineIndex}, ${match.index}, ${match[1].length}, ${tokenLegend.tokenTypes.indexOf(tokenTypes.class)}, 0] Full Match: ${JSON.stringify(match)}`);
            }
            tokensBuilder.push(lineIndex, match.index, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.class), 0);
            scopeStack.push({ type: 'class', lineStart: lineIndex });
        }

        // Match constructor
        if ((match = /(?:new\s+)(make)/gm.exec(line)) !== null) {
            if (settings.debug) {
                connection.console.log(` [-make-]      ${match[1].padEnd(20)} @ [${lineIndex}, ${match.index}, ${match[1].length}, ${tokenLegend.tokenTypes.indexOf(tokenTypes.class)}, 0] Full Match: ${JSON.stringify(match)}`);
            }
            tokensBuilder.push(lineIndex, match.index, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
        }

        // Match methods
        while ((match = fantomTokenRegex.methodPattern.exec(line)) !== null) {
            if (settings.debug) {
                connection.console.log(` [METHOD]      ${match[1].padEnd(20)} @ [${lineIndex}, ${match.index}, ${match[1].length}, ${tokenLegend.tokenTypes.indexOf(tokenTypes.method)}, 0]   ${JSON.stringify(match)}`);
            }
            tokensBuilder.push(lineIndex, match.index, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
            scopeStack.push({ type: 'method', lineStart: lineIndex });
        }

        // Match fields
        while ((match = fantomTokenRegex.fieldPattern.exec(line)) !== null) {
            if (!isInMethodScope(lineIndex)) {
                if (settings.debug) {
                    connection.console.log(` [FIELD]       ${match[1].padEnd(20)} @ [${lineIndex}, ${match.index}, ${match[1].length}, ${tokenLegend.tokenTypes.indexOf(tokenTypes.field)}, 0]   ${JSON.stringify(match)}`);
                }
                tokensBuilder.push(lineIndex, match.index, match[1].length, tokenLegend.tokenTypes.indexOf(tokenTypes.field), 0);
            } else if (settings.debug) {
                // connection.console.log(` [FIELD]       ignored ${match[1]} @ [${lineIndex}, ${match.index}]`);
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
        if (settings.debug) {
            connection.console.log(`No tokens found for document: ${doc.uri.split('/').pop()}, returning empty tokens.`);
        }
        return { data: [] };
    }

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
export function provideDocumentSymbols(uri: string): DocumentSymbol[] | undefined {
    const tokens = getDocumentTokens(uri);
    if (!tokens) {
        return undefined;
    }

    const classSymbols: Map<string, DocumentSymbol> = new Map();

    for (let i = 0; i < tokens.data.length; i += 5) {
        const line = tokens.data[i];
        const startChar = tokens.data[i + 1];
        const length = tokens.data[i + 2];
        const tokenType = tokens.data[i + 3];

        const range = Range.create(line, startChar, line, startChar + length);
        let kind: SymbolKind | undefined;
        let name = `Token ${i / 5}`;

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
                continue;
        }

        const symbol: DocumentSymbol = {
            name,
            kind,
            range,
            selectionRange: range,
            children: [],
        };

        if (kind === SymbolKind.Class) {
            classSymbols.set(name, symbol);
        } else if (kind === SymbolKind.Method || kind === SymbolKind.Field) {
            const parentClass = Array.from(classSymbols.values()).find(
                (cls) =>
                    cls.range.start.line <= line &&
                    cls.range.end.line >= line
            );

            if (parentClass) {
                if (parentClass.children) {
                    parentClass.children.push(symbol);
                }
            }
        }
    }

    return Array.from(classSymbols.values());
}
