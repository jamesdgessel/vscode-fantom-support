import { InitializeParams, InitializeResult, ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { Connection } from 'vscode-languageserver';

// Initializes and returns server capabilities
export function initializeCapabilities(connection: Connection, settings: any): InitializeResult {
    const capabilities: ServerCapabilities = {
        textDocumentSync: {
            openClose: true,
            change: TextDocumentSyncKind.Incremental,
        },
        documentSymbolProvider: true,
        semanticTokensProvider: {
            legend: {
                tokenTypes: ['variable','class','method','field'], 
                tokenModifiers: []
            },
            range: false,
            full: {
                delta: false
            }
        },
        hoverProvider: true,
    };

    return { capabilities };
}
