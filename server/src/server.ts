// server/src/server.ts

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
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams): InitializeResult => {
    const capabilities: InitializeResult['capabilities'] = {
        textDocumentSync: {
            openClose: true,
            change: TextDocumentSyncKind.Incremental,
        },
        documentSymbolProvider: true,
    };
    return { capabilities };
});

// Implement the Document Symbol Provider
connection.onDocumentSymbol(
    (params: DocumentSymbolParams, token: CancellationToken): DocumentSymbol[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
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
            const classStartIndex = match.index;
            const classStart = document.positionAt(classStartIndex);

            // Find the opening brace
            const braceIndex = text.indexOf('{', classStartIndex);
            if (braceIndex === -1) {
                continue; // No opening brace, skip
            }

            // Find the matching closing brace
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

            const classEndIndex = searchIndex;
            const classEnd = document.positionAt(classEndIndex);

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

            // Extract class body text
            const classBodyText = text.substring(braceIndex + 1, classEndIndex - 1);
            const classBodyOffset = braceIndex + 1;

            // Match methods within the class body
            const methodMatches: { range: [number, number] }[] = [];
            methodPattern.lastIndex = 0;
            let methodMatch: RegExpExecArray | null;
            while ((methodMatch = methodPattern.exec(classBodyText)) !== null) {
                const [fullMatch, returnType, methodName] = methodMatch;
                const methodStartIndex = classBodyOffset + methodMatch.index;

                // Find method end
                const methodBodyStartIndex = classBodyOffset + methodMatch.index + fullMatch.length - 1;
                let methodOpenBraces = 1;
                let methodSearchIndex = methodBodyStartIndex + 1;
                while (methodOpenBraces > 0 && methodSearchIndex < classEndIndex) {
                    const char = text[methodSearchIndex];
                    if (char === '{') {
                        methodOpenBraces++;
                    } else if (char === '}') {
                        methodOpenBraces--;
                    }
                    methodSearchIndex++;
                }
                const methodEndIndex = methodSearchIndex;

                // Exclude methods named after control structures
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

            // Remove method bodies from class body text
            let classFieldsText = classBodyText;
            for (const method of methodMatches.reverse()) {
                const [methodStartIndex, methodEndIndex] = method.range;
                const methodStartInClass = methodStartIndex - classBodyOffset;
                const methodEndInClass = methodEndIndex - classBodyOffset;
                // Replace method body with spaces to preserve line numbers
                const methodLength = methodEndInClass - methodStartInClass;
                classFieldsText =
                    classFieldsText.slice(0, methodStartInClass) +
                    ' '.repeat(methodLength) +
                    classFieldsText.slice(methodEndInClass);
            }

            // Match fields within the class body excluding methods
            fieldPattern.lastIndex = 0;
            let fieldMatch: RegExpExecArray | null;
            while ((fieldMatch = fieldPattern.exec(classFieldsText)) !== null) {
                const fieldType = fieldMatch[1];
                const fieldName = fieldMatch[2];
                const fieldStartIndex = classBodyOffset + fieldMatch.index;
                const fieldEndIndex = fieldStartIndex + fieldMatch[0].length;
                const start = document.positionAt(fieldStartIndex);
                const end = document.positionAt(fieldEndIndex);

                const fieldSymbol: DocumentSymbol = {
                    name: fieldName,
                    detail: fieldType,
                    kind: SymbolKind.Field,
                    range: Range.create(start, end),
                    selectionRange: Range.create(start, start),
                };

                classSymbol.children!.push(fieldSymbol);
            }
        }

        return symbols;
    }
);

// Listen to text document events
documents.listen(connection);

// Start the connection
connection.listen();
