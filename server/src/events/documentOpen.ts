import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver';
import { getSettings } from '../utils/settingsManager';

export function handleDocumentOpen(event: TextDocumentChangeEvent<TextDocument>, connection: Connection): void {
    const settings = getSettings();
    connection.console.log(`Document opened: ${event.document.uri.split('/').pop()}`);
    // Any initialization or general tasks for an opened document can go here.
}
