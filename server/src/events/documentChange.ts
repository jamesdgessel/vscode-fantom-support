import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver';
import { getSettings } from '../utils/settingsManager';

export function handleDocumentChange(change: TextDocumentChangeEvent<TextDocument>, connection: Connection): void {
    const settings = getSettings();
    connection.console.log(`Document changed: ${change.document.uri.split('/').pop()}`);
    // This function can handle any general tasks needed when a document changes.
}
