import { DocumentSymbolParams, Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getSettings } from '../utils/settingsManager';

export function provideDocumentSymbols(params: DocumentSymbolParams, documents: TextDocuments<TextDocument>, connection: Connection) {
    const settings = getSettings();
    const doc = documents.get(params.textDocument.uri);
    if (doc) {
        connection.console.log(`Providing document symbols for: ${doc.uri.split('/').pop()}`);
        // This function returns null because the actual symbol logic is handled in `server.ts` by the feature.
        return null;
    }
    return null;
}
