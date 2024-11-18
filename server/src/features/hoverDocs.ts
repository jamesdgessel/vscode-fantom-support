import { Hover, HoverParams, Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { runFanFile } from '../utils/fanUtils';
import { tokenLegend, tokenTypes } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsManager';

export async function provideHoverInfo(
    params: HoverParams,
    documents: TextDocuments<TextDocument>,
    connection: Connection
): Promise<Hover | null> {
    const settings = getSettings(); // Retrieve settings to control hover behavior
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
        if (settings.debug) {
            connection.console.log('Document not found.');
        }
        return null;
    }
    // if (settings.debug) {console.log(`Document found: ${doc.uri.split('/').pop()}`);}

    const tokens = getDocumentTokens(doc.uri);
    if (!tokens) {
        if (settings.debug) {
            connection.console.log('No tokens found for document.');
        }
        return null;
    }

    const position = params.position;
    const offset = doc.offsetAt(position);

    if (settings.debug) {
        connection.console.log(`Hover requested at position: ${JSON.stringify(position)}, offset: ${offset}`);
    }

    // Find the token at the current position
    for (let i = 0; i < tokens.data.length; i += 5) {
        const start = doc.offsetAt({ line: tokens.data[i], character: tokens.data[i + 1] });
        const end = start + tokens.data[i + 2];
        const tokenTypeIndex = tokens.data[i + 3];

        if (offset >= start && offset <= end) {
            const tokenType = tokenLegend.tokenTypes[tokenTypeIndex];
            const name = doc.getText().slice(start, end);

            if (settings.debug) {
                connection.console.log(`Hovering over: ${name}, Type: ${tokenType}`);
            }

            // Use `runFanFile` to perform the lookup for documentation
            const lookupResult = await runFanFile("fanLookup.fan", [name, tokenType]);

            if (settings.debug) {
                connection.console.log(`Lookup result: ${lookupResult}`);
            }

            return {
                contents: {
                    kind: 'markdown',
                    value: lookupResult
                }
            };
        }
    }

    if (settings.debug) {
        connection.console.log('No matching token found at the hover position.');
    }

    return null;
}
