import { DocumentSymbolParams, Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getSettings } from '../config/settingsHandler';
import { SemanticTokensParams } from 'vscode-languageserver/node';
import { logMessage } from '../utils/notify';

// Build semantic tokens
export function buildSemanticTokens(params: SemanticTokensParams, documents: any, settings: any, connection: any) {
    const module = '[buildSemanticTokens]';
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        logMessage('warn', "No document found for SemanticTokensParams", module, connection);
        return { data: [] };
    }

    // Explicitly type tokens as an array of numbers (or a specific token type if applicable)
    const tokens: number[] = []; // Add token generation logic here...

    logMessage('info', "Semantic Tokens built.", module, connection);
    return { data: tokens };
}