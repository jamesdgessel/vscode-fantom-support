import { InitializeParams, InitializeResult, ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { Connection } from 'vscode-languageserver';
import { tokenLegend } from '../utils/tokenTypes';

// Initializes and returns server capabilities
// Initializes and returns server capabilities
export function initializeCapabilities(connection: Connection, settings: any): InitializeResult {
    const capabilities: ServerCapabilities = {
        // Synchronizes text documents with the server
        textDocumentSync: {
            openClose: true, // Notify server on document open/close
            change: TextDocumentSyncKind.Incremental, // Incremental updates for document changes
        },

        // Supports hover functionality
        hoverProvider: true,

        // Supports document symbol functionality (e.g., outlining classes, methods, etc.)
        documentSymbolProvider: true,

        // Supports semantic tokens for syntax highlighting
        semanticTokensProvider: {
            legend: tokenLegend, // Legend defining token types/modifiers
            range: false,         // Supports semantic token requests for specific ranges
            full: true,          // Supports semantic token requests for the full document
        },

        // Supports auto-completion with the ability to resolve completion items
        completionProvider: {
            resolveProvider: true, // Server can resolve additional details for a completion item
        },

        // Supports document formatting functionality
        documentFormattingProvider: true,
    };

    return { capabilities };
}
