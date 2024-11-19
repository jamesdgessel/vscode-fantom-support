import { InitializeParams, InitializeResult, ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { Connection } from 'vscode-languageserver';
import { tokenLegend } from '../utils/tokenTypes';

// Initializes and returns server capabilities
export function initializeCapabilities(connection: Connection, settings: any): InitializeResult {
    const capabilities: ServerCapabilities = {
        textDocumentSync: {
            openClose: true,
            change: TextDocumentSyncKind.Incremental,
        },
        documentSymbolProvider: true,
        semanticTokensProvider: {
            legend: tokenLegend, // Use your defined legend here
            range: true,        // Enable range-based requests
            full: true,         // Enable full document requests
        },
        hoverProvider: true,
    };

    return { capabilities };
}
