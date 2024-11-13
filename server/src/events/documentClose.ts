import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver';
import { getSettings } from '../utils/settingsManager';

export function handleDocumentClose(event: TextDocumentChangeEvent<TextDocument>, connection: Connection): void {
    const settings = getSettings();
    connection.console.log(`Document closed: ${event.document.uri.split('/').pop()}`);
    // Perform any cleanup tasks for the closed document here, if necessary.
}
