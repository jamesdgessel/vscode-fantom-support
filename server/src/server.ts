import {
    createConnection,
    ProposedFeatures,
    TextDocuments,
    TextDocumentSyncKind,
    InitializeParams,
    InitializeResult,
    DocumentSymbolParams,
    CancellationToken,
    DocumentSymbol,
    SymbolKind,
    Range,
    Position,
    SemanticTokensBuilder,
    SemanticTokensParams,
    Diagnostic,
    DiagnosticSeverity,
    Hover,
    HoverParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Map to track variable symbols and positions per document
const variableSymbols: Map<string, Map<string, Position[]>> = new Map();
const documentDiagnostics: Map<string, Diagnostic[]> = new Map();

// Define the Token interface
interface Token {
    line: number;
    character: number;
    length: number;
    tokenType: number;
    tokenModifiers: number;
}

// Regular expressions to match string literals
const stringPatterns: RegExp[] = [
    /"([^"\\]|\\.)*"/g,
    /'([^'\\]|\\.)*'/g
];

interface ServerSettings {
    enableLogging: boolean;
    highlightVariableDeclarations: boolean;
    highlightVariableUsage: boolean;
}

let settings: ServerSettings = {
    enableLogging: true,
    highlightVariableDeclarations: false,
    highlightVariableUsage: false,
};

/**
 * Finds all string literal ranges in the document.
 * Supports single and double quotes with escape characters.
 * @param text The full text of the document.
 * @param document The TextDocument object.
 * @returns An array of Range objects representing string literals.
 */
function findStringRanges(text: string, document: TextDocument): Range[] {
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
 * @param position The Position to check.
 * @param ranges An array of Range objects.
 * @returns True if the position is within any range; otherwise, false.
 */
function isPositionInRanges(position: Position, ranges: Range[]): boolean {
    return ranges.some(range => isPositionWithinRange(position, range));
}

/**
 * Determines if a position is within a specific range.
 * @param position The Position to check.
 * @param range The Range to compare against.
 * @returns True if the position is within the range; otherwise, false.
 */
function isPositionWithinRange(position: Position, range: Range): boolean {
    if (position.line < range.start.line || position.line > range.end.line) {
        return false;
    }
    if (position.line === range.start.line && position.character < range.start.character) {
        return false;
    }
    if (position.line === range.end.line && position.character > range.end.character) {
        return false;
    }
    return true;
}

/**
 * Helper function to get the range of the word at a given position
 */
function getWordRangeAtPosition(document: TextDocument, position: Position): Range | null {
    const text = document.getText();
    const offset = document.offsetAt(position);
    if (offset >= text.length) { return null; }

    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
    }

    let end = offset;
    while (end < text.length && /\w/.test(text[end])) {
        end++;
    }

    return Range.create(document.positionAt(start), document.positionAt(end));
}

// Clear variable symbols when a new document is opened
documents.onDidOpen(event => {
    const uri = event.document.uri;
    variableSymbols.set(uri, new Map());
    if (settings.enableLogging) {
        connection.console.log(`Document opened: ${getDocumentName(uri)}, cleared variable symbols.`);
    }
});

// Update variable symbols and linting on content change
documents.onDidChangeContent(change => {
    const document = change.document;
    if (settings.enableLogging) {
        connection.console.log(`Document changed: ${getDocumentName(document.uri)}`);
    }
    updateVariableSymbols(document);
    validateNamingConventions(document); // Lint on content change
});

/**
 * Validates naming conventions based on Fantom linting rules.
 * @param document The TextDocument object.
 */
function validateNamingConventions(document: TextDocument) {
    const diagnostics: Diagnostic[] = [];
    const text = document.getText();

    const typePattern = /\bclass\s+([A-Z][a-zA-Z0-9]*)\b/g;
    const slotPattern = /\b(?:const|field|method)\s+([a-z][a-zA-Z0-9]*)\b/g;

    let match: RegExpExecArray | null;
    while ((match = typePattern.exec(text)) !== null) {
        const range = Range.create(
            document.positionAt(match.index),
            document.positionAt(match.index + match[1].length)
        );
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(match[1])) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range,
                message: `Type names should be UpperCamelCase.`,
                source: 'fantom-linter'
            });
        }
    }

    while ((match = slotPattern.exec(text)) !== null) {
        const range = Range.create(
            document.positionAt(match.index),
            document.positionAt(match.index + match[1].length)
        );
        if (!/^[a-z][a-zA-Z0-9]*$/.test(match[1])) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range,
                message: `Slot names should be lowerCamelCase.`,
                source: 'fantom-linter'
            });
        }
    }

    documentDiagnostics.set(document.uri, diagnostics);
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

/**
 * Function to update variable symbols for a given document
 */
function updateVariableSymbols(document: TextDocument): void {
    const uri = document.uri;
    const text = document.getText();
    const variablePattern = /\b(\w+)\b(?=\s*:=)/g; 
    let match: RegExpExecArray | null;

    const stringRanges = findStringRanges(text, document);

    if (!variableSymbols.has(uri)) {
        variableSymbols.set(uri, new Map());
    }
    const docVariableSymbols = variableSymbols.get(uri)!;
    docVariableSymbols.clear();

    while ((match = variablePattern.exec(text)) !== null) {
        const variableName = match[1];
        const variablePosition = document.positionAt(match.index);

        if (isPositionInRanges(variablePosition, stringRanges)) {
            continue; 
        }

        if (!docVariableSymbols.has(variableName)) {
            docVariableSymbols.set(variableName, []);
        }

        docVariableSymbols.get(variableName)!.push(variablePosition);
    }

    docVariableSymbols.forEach((positions, variableName) => {
        const wordPattern = new RegExp(`\\b${escapeRegExp(variableName)}\\b`, 'g');
        let wordMatch: RegExpExecArray | null;

        while ((wordMatch = wordPattern.exec(text)) !== null) {
            const position = document.positionAt(wordMatch.index);

            if (isPositionInRanges(position, stringRanges)) {
                continue;
            }

            const isAlreadyCaptured = positions.some(pos => pos.line === position.line && pos.character === position.character);

            if (!isAlreadyCaptured) {
                positions.push(position);
            }
        }
    });
}

/**
 * Escapes special characters in a string for use in a regular expression
 */
function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Retrieves the document name from its URI
 */
function getDocumentName(uri: string): string {
    return uri.split('/').pop() || uri;
}

// Initialization with semantic tokens capability
connection.onInitialize((params: InitializeParams): InitializeResult => {
    const capabilities: InitializeResult['capabilities'] = {
        textDocumentSync: {
            openClose: true,
            change: TextDocumentSyncKind.Incremental,
        },
        documentSymbolProvider: true,
        semanticTokensProvider: {
            legend: {
                tokenTypes: ['variable'], 
                tokenModifiers: []
            },
            range: false,
            full: {
                delta: false
            }
        },
        hoverProvider: true // Add hover provider capability
    };
    connection.console.log("Language server initialized with capabilities.");
    return { capabilities };
});

connection.onDidChangeConfiguration(change => {
    const newSettings = change.settings.languageServerExample || {};
    settings = {
        enableLogging: newSettings.enableLogging !== false,
        highlightVariableDeclarations: newSettings.highlightVariableDeclarations !== false,
        highlightVariableUsage: newSettings.highlightVariableUsage !== false,
    };
    connection.console.log(`Settings updated: ${JSON.stringify(settings)}`);
});

// Document Symbol Provider for structural syntax highlighting
connection.onDocumentSymbol(
    (params: DocumentSymbolParams, token: CancellationToken): DocumentSymbol[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            connection.console.warn("No document found for URI:" + getDocumentName(params.textDocument.uri));
            return [];
        }

        const text = document.getText();
        const symbols: DocumentSymbol[] = [];

        const classPattern = /class\s+(\w+)/g;
        const methodPattern = /(?:\b(?:override|static|virtual|abstract|final)\b\s+)*(\w+)\s+(\w+)\s*\([^)]*\)\s*\{/g;
        const fieldPattern = /^\s*(\w+)\s+(\w+)\s*:=/gm;

        let match: RegExpExecArray | null;
        const classSymbols: DocumentSymbol[] = [];

        while ((match = classPattern.exec(text)) !== null) {
            const className = match[1];
            const classStart = document.positionAt(match.index);
            const braceIndex = text.indexOf('{', match.index);
            if (braceIndex === -1) {
                connection.console.warn(`No opening brace found for class ${className}`);
                continue;
            }

            let openBraces = 1;
            let searchIndex = braceIndex + 1;
            while (openBraces > 0 && searchIndex < text.length) {
                const char = text[searchIndex];
                if (char === '{') {
                    openBraces++;
                } else if (char === '}') {
                    openBraces--;
                }
                searchIndex++;
            }

            const classEnd = document.positionAt(searchIndex);
            const classSymbol: DocumentSymbol = {
                name: className,
                detail: 'Class',
                kind: SymbolKind.Class,
                range: Range.create(classStart, classEnd),
                selectionRange: Range.create(classStart, classStart),
                children: [],
            };

            symbols.push(classSymbol);

            const classBodyText = text.substring(braceIndex + 1, searchIndex - 1);
            const classBodyOffset = braceIndex + 1;

            const methodMatches: { range: [number, number] }[] = [];
            methodPattern.lastIndex = 0;
            let methodMatch: RegExpExecArray | null;
            while ((methodMatch = methodPattern.exec(classBodyText)) !== null) {
                const [fullMatch, returnType, methodName] = methodMatch;
                const methodStartIndex = classBodyOffset + methodMatch.index;

                let methodOpenBraces = 1;
                let methodSearchIndex = methodStartIndex + fullMatch.length - 1;
                while (methodOpenBraces > 0 && methodSearchIndex < searchIndex) {
                    const char = text[methodSearchIndex];
                    if (char === '{') {
                        methodOpenBraces++;
                    } else if (char === '}') {
                        methodOpenBraces--;
                    }
                    methodSearchIndex++;
                }
                const methodEndIndex = methodSearchIndex;

                if (['if', 'for', 'while', 'switch', 'catch'].includes(methodName)) {
                    continue;
                }

                const start = document.positionAt(methodStartIndex);
                const end = document.positionAt(methodEndIndex);
                const methodSymbol: DocumentSymbol = {
                    name: methodName,
                    detail: returnType,
                    kind: SymbolKind.Method,
                    range: Range.create(start, end),
                    selectionRange: Range.create(start, start),
                    children: [],
                };

                classSymbol.children!.push(methodSymbol);
                methodMatches.push({ range: [methodStartIndex, methodEndIndex] });
            }

            let classFieldsText = classBodyText;
            for (const method of methodMatches.reverse()) {
                const [methodStartIndex, methodEndIndex] = method.range;
                const methodStartInClass = methodStartIndex - classBodyOffset;
                const methodEndInClass = methodEndIndex - classBodyOffset;
                classFieldsText =
                    classFieldsText.slice(0, methodStartInClass) +
                    ' '.repeat(methodEndInClass - methodStartInClass) +
                    classFieldsText.slice(methodEndInClass);
            }

            fieldPattern.lastIndex = 0;
            let fieldMatch: RegExpExecArray | null;
            while ((fieldMatch = fieldPattern.exec(classFieldsText)) !== null) {
                const fieldType = fieldMatch[1];
                const fieldName = fieldMatch[2];
                const fieldStart = document.positionAt(classBodyOffset + fieldMatch.index);

                const fieldSymbol: DocumentSymbol = {
                    name: fieldName,
                    detail: fieldType,
                    kind: SymbolKind.Field,
                    range: Range.create(fieldStart, fieldStart),
                    selectionRange: Range.create(fieldStart, fieldStart),
                };

                classSymbol.children!.push(fieldSymbol);
            }
        }

        return symbols;
    }
);

// Semantic Tokens Provider
connection.languages.semanticTokens.on((params: SemanticTokensParams) => {
    if (!settings.highlightVariableDeclarations && !settings.highlightVariableUsage) {
        return { data: [] };
    }

    const document = documents.get(params.textDocument.uri);
    if (!document) {
        connection.console.warn("No document found for SemanticTokensParams");
        return { data: [] };
    }

    const tokensBuilder = new SemanticTokensBuilder();
    const uri = document.uri;
    const docVariableSymbols = variableSymbols.get(uri);
    if (!docVariableSymbols) {
        return { data: [] };
    }

    const text = document.getText();
    const stringRanges = findStringRanges(text, document);

    // Collect all tokens
    const allTokens: Token[] = [];

    docVariableSymbols.forEach((positions, variableName) => {
        positions.forEach(position => {
            const wordRange = getWordRangeAtPosition(document, position);
            if (wordRange && document.getText(wordRange) === variableName) {
                if (isPositionInRanges(position, stringRanges)) {
                    return; 
                }

                if (settings.highlightVariableDeclarations || !isVariableDeclaration(position, text)) {
                    allTokens.push({
                        line: position.line,
                        character: position.character,
                        length: variableName.length,
                        tokenType: 0,
                        tokenModifiers: 0
                    });
                }
            }
        });
    });

    allTokens.sort((a, b) => {
        if (a.line !== b.line) {
            return a.line - b.line;
        }
        return a.character - b.character;
    });

    allTokens.forEach(token => {
        tokensBuilder.push(
            token.line,
            token.character,
            token.length,
            token.tokenType,
            token.tokenModifiers
        );
    });

    const tokens = tokensBuilder.build();
    if (settings.enableLogging) {
        connection.console.log("Semantic Tokens built.");
    }
    return tokens;
});

/**
 * Determines if a position is a variable declaration.
 * @param position The Position to check.
 * @param text The full text of the document.
 * @returns True if the position is a variable declaration; otherwise, false.
 */
function isVariableDeclaration(position: Position, text: string): boolean {
    const lines = text.split('\n');
    const line = lines[position.line];
    const variablePattern = /\b(\w+)\b(?=\s*:=)/g;
    let match: RegExpExecArray | null;
    while ((match = variablePattern.exec(line)) !== null) {
        if (match.index === position.character) {
            return true;
        }
    }
    return false;
}

// Hover diagnostics for linting feedback on hover
connection.onHover((params: HoverParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {return null;}

    const diagnostics = documentDiagnostics.get(params.textDocument.uri) || [];
    const position = params.position;

    for (const diagnostic of diagnostics) {
        if (
            position.line === diagnostic.range.start.line &&
            position.character >= diagnostic.range.start.character &&
            position.character <= diagnostic.range.end.character
        ) {
            return {
                contents: {
                    kind: 'markdown',
                    value: diagnostic.message,
                },
                range: diagnostic.range
            };
        }
    }

    return null;
});

// Listen to text document events
documents.listen(connection);
connection.listen();
