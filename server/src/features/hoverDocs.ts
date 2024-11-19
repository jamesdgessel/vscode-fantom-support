import { Hover, HoverParams, Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { runFanFile } from '../utils/fanUtils';
import { tokenLegend } from '../utils/tokenTypes';
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

    // Retrieve the hovered word manually
    const text = doc.getText();
    let start = offset;
    let end = offset;

    // Expand to the start of the word
    while (start > 0 && /\w/.test(text.charAt(start - 1))) {
        start--;
    }

    // Expand to the end of the word
    while (end < text.length && /\w/.test(text.charAt(end))) {
        end++;
    }

    const hoveredWord = text.slice(start, end);

    if (!hoveredWord) {
        if (settings.debug) {
            connection.console.log('No word found at hover position.');
        }
        return null;
    }

    if (settings.debug) {
        connection.console.log(`Hovered word: ${hoveredWord}`);
    }

    // Check if the hovered word matches any token
    for (let i = 0; i < tokens.data.length; i += 5) {
        const tokenStart = doc.offsetAt({ line: tokens.data[i], character: tokens.data[i + 1] });
        const tokenEnd = tokenStart + tokens.data[i + 2];
        const tokenTypeIndex = tokens.data[i + 3];

        if (hoveredWord === text.slice(tokenStart, tokenEnd)) {
            const tokenType = tokenLegend.tokenTypes[tokenTypeIndex];
            const declarationLine = tokens.data[i];

            // Find all instances of the token
            const instances: number[] = [];
            for (let j = 0; j < tokens.data.length; j += 5) {
                const instanceStart = doc.offsetAt({ line: tokens.data[j], character: tokens.data[j + 1] });
                const instanceEnd = instanceStart + tokens.data[j + 2];
                if (text.slice(instanceStart, instanceEnd) === hoveredWord) {
                    instances.push(tokens.data[j]);
                }
            }

            if (settings.debug) {
                connection.console.log(`Token match found: ${hoveredWord}, Type: ${tokenType}`);
            }

            return {
                contents: {
                    kind: 'markdown',
                    value: `
**Token Name**: ${hoveredWord}
            
**Type**: ${tokenType}
            
**Declaration**: Line ${declarationLine + 1}
            
**Instances**: ${instances.map(line => `Line ${line + 1}`).join(', ') || 'None'}
`
                }
            };
        }
    }

    // Check for existing tokens with the same name
    const matchingToken = tokens.data.some((_, j) => {
        const instanceStart = doc.offsetAt({ line: tokens.data[j], character: tokens.data[j + 1] });
        const instanceEnd = instanceStart + tokens.data[j + 2];
        return text.slice(instanceStart, instanceEnd) === hoveredWord;
    });

    if (matchingToken) {
        if (settings.debug) {
            connection.console.log(`Existing token found for word: ${hoveredWord}`);
        }

        return {
            contents: {
                kind: 'markdown',
                value: `**Word**: ${hoveredWord}\n\n**Note**: Matches an existing token.`
            }
        };
    }

    // Placeholder for "lookup in Fantom"
    if (settings.debug) {
        connection.console.log(`No token found for word: ${hoveredWord}. Providing lookup placeholder.`);
    }

    return {
        contents: {
            kind: 'markdown',
            value: `**Word**: ${hoveredWord}\n\n**Action**: [Lookup in Fantom](#)`
        }
    };
}
