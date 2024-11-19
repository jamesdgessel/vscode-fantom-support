// Import necessary modules from vscode-languageserver
import {
    createConnection,
    ProposedFeatures,
    TextDocuments,
    InitializeParams,
    InitializeResult,
    DocumentSymbolParams,
    SemanticTokensParams,
    HoverParams,
    CompletionParams,
    DidChangeConfigurationParams,
    TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Import event handlers
import { initializeCapabilities } from './events/serverCapabilities';
import { handleDocumentSave } from './events/documentSave';
import { handleConfigChange } from './events/configChange';

// Import feature modules
import { buildSemanticTokens,provideDocumentSymbols } from './features/buildTokens';
import { provideHoverInfo } from './features/hoverDocs';
import { provideCompletionItems } from './features/autocomplete';
import { formatDocument } from './features/formatting';
import { buildOutline } from './features/codeOutline';
import { lintCode } from './features/codeLinting';
import { applySyntaxHighlighting } from './features/syntaxHighlighting';
import { initializeSidebarDocs } from './features/sidebarDocs';

// Import utility functions
import { executeFanCmd } from './utils/fanUtils';
import { initializeSettings, updateSettings, getSettings } from './utils/settingsManager';

// Initialize server connection and documents manager
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Initialize settings
let settings = initializeSettings(connection);

// Initialize capabilities on server startup
connection.onInitialize((params: InitializeParams): InitializeResult => {
    console.log(' -------------------- Fantom server initialized ---------- ');
    initializeCapabilities(connection, settings);
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: { resolveProvider: true },
            hoverProvider: true,
            documentSymbolProvider: true,
            semanticTokensProvider: {
                legend: { tokenTypes: [], tokenModifiers: [] },
                range: false,
                full: true,
            },
            documentFormattingProvider: true
        }
    };
});

// Handle document open event
documents.onDidOpen(event => {
    console.log(' -------------------- Document opened ---------- ');
    // buildOutline(event.document, connection); // Generate the outline when a document opens
    // buildSemanticTokens(event.document, connection);               // Uses centralized settings
    // applySyntaxHighlighting(event.document, connection);           // Uses centralized settings
    // generateCodeOutline(event.document, connection);               // Uses centralized settings
    // initializeSidebarDocs(connection);                             // No changes needed
    // lintCode(event.document, connection);                          // Uses centralized settings
});

// Handle document change event
documents.onDidChangeContent(change => {
    console.log(' -------------------- Document content changed ---------- ');
    buildSemanticTokens(change.document, connection);
    buildOutline(change.document, connection); // Generate the outline when a document opens
    // buildSemanticTokens(change.document, connection);              // Uses centralized settings
    // applySyntaxHighlighting(change.document, connection);          // Uses centralized settings
    // generateCodeOutline(change.document, connection);              // Uses centralized settings
    // lintCode(change.document, connection);                         // Uses centralized settings

});

// Handle document save event
documents.onDidSave(event => {
    console.log(' -------------------- Document saved ---------- ');
    handleDocumentSave(event, connection);
    // lintCode(event.document, connection);                          // Uses centralized settings
});

// Handle document close event
documents.onDidClose(event => {
    console.log(' -------------------- Document closed ---------- ');
});

// Handle configuration change
connection.onDidChangeConfiguration((change: DidChangeConfigurationParams) => {
    console.log(' -------------------- Config changed  ---------- ');
    settings = updateSettings(change, connection);
    handleConfigChange(change, connection);
});

// Provide document symbols for syntax highlighting
connection.onDocumentSymbol((params: DocumentSymbolParams) => {
    console.log(' -------------------- Document Symbol ---------- ');
    return provideDocumentSymbols(params.textDocument.uri, connection, documents);
});

// Build semantic tokens for enhanced syntax highlighting
connection.languages.semanticTokens.on((params: SemanticTokensParams) => {
    console.log(' -------------------- Tokens requested ---------- ');
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
        return { data: [] };
    }
    return buildSemanticTokens(doc, connection);
});

// Provide hover information for symbols
// connection.onHover((params: HoverParams) => {
//     return provideHoverInfo(params, documents, connection);
// });

// // Provide autocomplete suggestions
// connection.onCompletion((params: CompletionParams) => {
//     return provideCompletionItems(params, documents, connection);
// });

// Format document on request
// connection.onDocumentFormatting((params) => {
//     const doc = documents.get(params.textDocument.uri);
//     return doc ? formatDocument(doc, params) : [];
// });

// Start listening to document events
documents.listen(connection);
connection.listen();
