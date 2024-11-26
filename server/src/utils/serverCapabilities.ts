import { InitializeResult, ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { Connection, ConnectionError, InitializeParams, WorkspaceFolder } from 'vscode-languageserver';
import { tokenLegend } from './tokenTypes';
import { initializeSettings, isFeatureEnabled } from './settingsHandler';
import { logMessage } from './notify';

// Initializes and returns server capabilities
export function initializeCapabilities(connection: Connection, params: InitializeParams): InitializeResult {

    logMessage('info', 'Initializing language server', '[SERVER]', connection);

    const settings = initializeSettings(connection);

    const capabilities: ServerCapabilities = {
        // Synchronizes text documents with the server
        textDocumentSync: {
            openClose: true, // Notify server on document open/close
            change: TextDocumentSyncKind.Incremental, // Incremental updates for document changes
        },

        // Get workspace folders
        workspace: {
            workspaceFolders: {
                supported: true,
            },
        },

        // Supports hover functionality
        hoverProvider: isFeatureEnabled('hoverDocs'),

        // Supports document symbol functionality (e.g., outlining classes, methods, etc.)
        documentSymbolProvider: isFeatureEnabled('codeOutline'),

        // Supports semantic tokens for syntax highlighting
        semanticTokensProvider: isFeatureEnabled('syntaxHighlighting') ? {
            legend: tokenLegend, // Legend defining token types/modifiers
            range: false,         // Supports semantic token requests for specific ranges
            full: true,          // Supports semantic token requests for the full document
        } : undefined,

        // Supports auto-completion with the ability to resolve completion items
        completionProvider: isFeatureEnabled('autocompletion') ? {
            resolveProvider: true, // Server can resolve additional details for a completion item
        } : undefined,

        // Supports document formatting functionality
        documentFormattingProvider: isFeatureEnabled('formatting'),
    };

    return { capabilities };
}
