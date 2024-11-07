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

// Map to track variable symbols and positions
const variableSymbols = new Map<string, Position[]>();

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
            full: true
        }
    };
    console.log("Language server initialized with capabilities:", capabilities);
    return { capabilities };
});

// Document Symbol Provider
connection.onDocumentSymbol(
    (params: DocumentSymbolParams, token: CancellationToken): DocumentSymbol[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            console.log("No document found for URI:", params.textDocument.uri);
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
            console.log(`Class found: ${className} at ${classStart.line}:${classStart.character}`);
            const braceIndex = text.indexOf('{', match.index);
            if (braceIndex === -1) {
                console.log(`No opening brace found for class ${className}`);
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

            classSymbols.push(classSymbol);
            symbols.push(classSymbol);

            const classBodyText = text.substring(braceIndex + 1, searchIndex - 1);
            const classBodyOffset = braceIndex + 1;

            const methodMatches: { range: [number, number] }[] = [];
            methodPattern.lastIndex = 0;
            let methodMatch: RegExpExecArray | null;
            while ((methodMatch = methodPattern.exec(classBodyText)) !== null) {
                const [fullMatch, returnType, methodName] = methodMatch;
                const methodStartIndex = classBodyOffset + methodMatch.index;
                console.log(`Method found: ${methodName} with return type ${returnType} at index ${methodStartIndex}`);

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
                    console.log(`Skipping control structure method name: ${methodName}`);
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
                console.log(`Field found: ${fieldName} of type ${fieldType} at ${fieldStart.line}:${fieldStart.character}`);

                const fieldSymbol: DocumentSymbol = {
                    name: fieldName,
                    detail: fieldType,
                    kind: SymbolKind.Field,
                    range: Range.create(fieldStart, fieldStart),
                    selectionRange: Range.create(fieldStart, fieldStart),
                };

                if (!variableSymbols.has(fieldName)) {
                    variableSymbols.set(fieldName, []);
                }
                variableSymbols.get(fieldName)!.push(fieldStart);
                classSymbol.children!.push(fieldSymbol);
            }
        }

        return symbols;
    }
);

// Semantic Tokens Provider
connection.languages.semanticTokens.on((params: SemanticTokensParams) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        console.log("No document found for SemanticTokensParams");
        return { data: [] };
    }

    const tokensBuilder = new SemanticTokensBuilder();

    // Highlight all tracked variables
    variableSymbols.forEach((positions, variableName) => {
        positions.forEach(position => {
            const offset = document.offsetAt(position);
            console.log(`Tokenizing variable: ${variableName} at ${position.line}:${position.character}`);
            tokensBuilder.push(
                document.positionAt(offset).line,
                document.positionAt(offset).character,
                variableName.length,
                0,  // Token type index (0 for 'variable')
                0   // Token modifiers (none)
            );
        });
    });

    return tokensBuilder.build();
});

// Listen to text document events
documents.listen(connection);
connection.listen();
