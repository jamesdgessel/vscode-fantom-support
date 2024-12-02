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
    DidChangeConfigurationParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Import event handlers
import { initializeCapabilities } from './config/serverCapabilities';

// Import feature modules
import { buildSemanticTokens, provideDocumentSymbols } from './modules/buildTokens';
import { provideHoverInfo } from './modules/hoverDocs';
import { provideCompletionItems } from './modules/autocomplete';
import { formatDocument } from './modules/formatting';
import { buildOutline } from './modules/codeOutline';
import { applySyntaxHighlighting } from './modules/syntaxHighlighting';

// Import utility functions
import { logMessage, notifyUser } from './utils/notify';
import { FantomDocs } from './modules/fantomDocs';
import { getSettings, updateSettings } from './config/settingsHandler';

// Initialize server connection and documents manager
export const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

export let fantom: FantomDocs;

// Global unhandled promise rejection handler
// process.on('unhandledRejection', (reason, promise) => {
//     logMessage('err', `Unhandled Promise Rejection: ${reason}`, '[SERVER]', connection);
// });

// Initialize capabilities on server startup
connection.onInitialize((params: InitializeParams): InitializeResult => {
    logMessage('info', 'Fantom server initialized', '[SERVER]', connection);
    updateSettings(params.initializationOptions || {});

    FantomDocs.create(getSettings()).then((createdFantom) => {
        fantom = createdFantom;
    }).catch((error) => {
        logMessage('err', `Failed to initialize FanEnv: ${error}`, '[SERVER]', connection);
    });
    
    return initializeCapabilities(connection, params);
});

// Handle document open event
documents.onDidOpen(async event => {
    logMessage('info', 'Document opened', '[SERVER]', connection);
    await applySyntaxHighlighting(event.document, connection);
});

// Handle document change event
documents.onDidChangeContent(async change => {
    logMessage('info', 'Document content changed', '[SERVER]', connection);
    await buildSemanticTokens(change.document, connection);
    await buildOutline(change.document, connection);
    await applySyntaxHighlighting(change.document, connection);
});

// Handle document save event
documents.onDidSave(async event => {
    logMessage('info', 'Document saved', '[SERVER]', connection);
    await applySyntaxHighlighting(event.document, connection);
});

// Handle document close event
documents.onDidClose(event => {
    logMessage('info', 'Document closed', '[SERVER]', connection);
});

// Handle configuration change
connection.onDidChangeConfiguration(async (change: DidChangeConfigurationParams) => {
    logMessage('info','Server configuration changed.', '[SERVER]', connection);
    await updateSettings(change.settings);
});

// Handle workspace folder change
// connection.workspace.onDidChangeWorkspaceFolders((event) => {
//     logMessage('info', 'Workspace folders changed', '[SERVER]', connection)
// });

// Provide document symbols for syntax highlighting
connection.onDocumentSymbol((params: DocumentSymbolParams) => {
    logMessage('debug', 'Document Symbol requested', '[SERVER]', connection);
    return provideDocumentSymbols(params.textDocument.uri, connection, documents);
});

// Build semantic tokens for enhanced syntax highlighting
connection.languages.semanticTokens.on((params: SemanticTokensParams) => {
    logMessage('info', 'Tokens requested', '[SERVER]', connection);
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
        return { data: [] };
    }
    return buildSemanticTokens(doc, connection);
});

// Provide hover information for symbols
connection.onHover((params: HoverParams) => {
    return provideHoverInfo(fantom, params, documents, connection);
});

// Provide autocomplete suggestions
connection.onCompletion((params: CompletionParams) => {
    return provideCompletionItems(params, documents, connection);
});

// Format document on request
connection.onDocumentFormatting((params) => {
    const doc = documents.get(params.textDocument.uri);
    return doc ? formatDocument(doc, params) : [];
});

// Start listening to document events
documents.listen(connection);
connection.listen();
