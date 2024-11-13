import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver';
import { getSettings } from '../utils/settingsManager';

export function handleDocumentSave(event: TextDocumentChangeEvent<TextDocument>, connection: Connection): void {
    const settings = getSettings();
    connection.console.log(`Document saved: ${event.document.uri.split('/').pop()}`);
    // Any general tasks after a document is saved can be added here.
}
