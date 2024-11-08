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
    SemanticTokensParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Map to track variable symbols and positions per document
const variableSymbols: Map<string, Map<string, Position[]>> = new Map();

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
    enableLogging: false,
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

    // Find the start of the word
    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
    }

    // Find the end of the word
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

// Update variable symbols when the document content changes
documents.onDidChangeContent(change => {
    const document = change.document;
    if (settings.enableLogging) {
        connection.console.log(`Document changed: ${getDocumentName(document.uri)}`);
    }
    updateVariableSymbols(document);
});

/**
 * Function to update variable symbols for a given document
 */
function updateVariableSymbols(document: TextDocument): void {
    const uri = document.uri;
    const text = document.getText();
    const variablePattern = /\b(\w+)\b(?=\s*:=)/g; // Refined regex to match variable names only
    let match: RegExpExecArray | null;

    // Identify all string literal ranges in the document
    const stringRanges = findStringRanges(text, document);

    // Initialize or clear the map for the current document
    if (!variableSymbols.has(uri)) {
        variableSymbols.set(uri, new Map());
    }
    const docVariableSymbols = variableSymbols.get(uri)!;
    docVariableSymbols.clear(); // Clear previous symbols to avoid duplication

    // First pass: find variable declarations
    while ((match = variablePattern.exec(text)) !== null) {
        const variableName = match[1];
        const variablePosition = document.positionAt(match.index);

        // Check if the variable position is within any string literal
        if (isPositionInRanges(variablePosition, stringRanges)) {
            // continue; // Skip variables within strings
        }

        // Initialize the array if this is the first occurrence
        if (!docVariableSymbols.has(variableName)) {
            docVariableSymbols.set(variableName, []);
        }

        // Push the current position to capture each match
        docVariableSymbols.get(variableName)!.push(variablePosition);

        // connection.console.log(`Variable found: ${variableName} at ${variablePosition.line}:${variablePosition.character}`);
    }

    // Second pass: find all occurrences of the variables
    docVariableSymbols.forEach((positions, variableName) => {
        const wordPattern = new RegExp(`\\b${escapeRegExp(variableName)}\\b`, 'g');
        let wordMatch: RegExpExecArray | null;

        while ((wordMatch = wordPattern.exec(text)) !== null) {
            const position = document.positionAt(wordMatch.index);

            // Check if the position is within any string literal
            if (isPositionInRanges(position, stringRanges)) {
                // connection.console.log(`Skipping occurrence of variable '${variableName}' at ${position.line}:${position.character} (within a string literal)`);
                continue; // Skip occurrences within strings
            }

            // Check if the position is already captured
            const isAlreadyCaptured = positions.some(pos => pos.line === position.line && pos.character === position.character);

            if (!isAlreadyCaptured) {
                positions.push(position);
                // connection.console.log(`Variable occurrence found: ${variableName} at ${position.line}:${position.character}`);
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
        semanticTokensProvider: {  // Enable semantic tokens provider
            legend: {
                tokenTypes: ['variable'], // Ensure 'variable' is distinct
                tokenModifiers: []
            },
            range: false,
            full: {
                delta: false
            }
        }
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
            connection.console.warn("No document found for URI:"+getDocumentName(params.textDocument.uri));
            return [];
        }

        const text = document.getText();
        const symbols: DocumentSymbol[] = [];

        const classPattern = /class\s+(\w+)/g;
        const methodPattern = /(?:\b(?:override|static|virtual|abstract|final)\b\s+)*(\w+)\s+(\w+)\s*\([^)]*\)\s*\{/g;
        const fieldPattern = /^\s*(\w+)\s+(\w+)\s*:=/gm;

        let match: RegExpExecArray | null;
        const classSymbols: DocumentSymbol[] = [];

        // Match all classes in the document
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
                    return; // Skip tokens within strings
                }

                if (settings.highlightVariableDeclarations || !isVariableDeclaration(position, text)) {
                    allTokens.push({
                        line: position.line,
                        character: position.character,
                        length: variableName.length,
                        tokenType: 0, // 'variable'
                        tokenModifiers: 0
                    });
                }
            }
        });
    });

    // Sort tokens by line and character
    allTokens.sort((a, b) => {
        if (a.line !== b.line) {
            return a.line - b.line;
        }
        return a.character - b.character;
    });

    // Push sorted tokens
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

// Listen to text document events
documents.listen(connection);
connection.listen();
