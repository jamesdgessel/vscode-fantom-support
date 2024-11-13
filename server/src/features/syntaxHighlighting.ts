import { Connection, DocumentColorParams, ColorInformation, ColorPresentation, ColorPresentationParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { tokenLegend } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsManager';

// Retrieves color information based on pre-built tokens and settings
export function applySyntaxHighlighting(doc: TextDocument, connection: Connection): ColorInformation[] {
    const settings = getSettings(); // Retrieve settings for syntax highlighting
    const tokens = getDocumentTokens(doc.uri);
    console.log(tokens);
    if (!tokens) {
        if (settings.debug) {
            connection.console.log(`No tokens found for document: ${doc.uri.split('/').pop()}`);
        }
        return [];
    }

    const colorInfo: ColorInformation[] = [];

    if (settings.debug) {
        connection.console.log(`Applying syntax highlighting for document: ${doc.uri.split('/').pop()}`);
    }

    // Loop through tokens and apply highlighting based on token types and settings
    for (let i = 0; i < tokens.data.length; i += 5) {
        const line = tokens.data[i];
        const startChar = tokens.data[i + 1];
        const length = tokens.data[i + 2];
        const tokenTypeIndex = tokens.data[i + 3];

        const tokenType = tokenLegend.tokenTypes[tokenTypeIndex];
        const startPos = { line, character: startChar };
        const endPos = { line, character: startChar + length };

        // Determine color based on token type and settings
        let color;
        if (tokenType === 'class' && settings.enableClassHighlighting) {
            color = { red: 0.2, green: 0.4, blue: 0.8, alpha: 1.0 };
            if (settings.debug) {
                // connection.console.log(`Class token at line ${line}, char ${startChar}, length ${length}`);
            }
        } else if (tokenType === 'method' && settings.enableMethodHighlighting) {
            color = { red: 0.3, green: 0.7, blue: 0.3, alpha: 1.0 };
            if (settings.debug) {
                // connection.console.log(`Method token at line ${line}, char ${startChar}, length ${length}`);
            }
        } else if (tokenType === 'field' && settings.enableFieldHighlighting) {
            color = { red: 0.8, green: 0.2, blue: 0.5, alpha: 1.0 };
            if (settings.debug) {
                // connection.console.log(`Field token at line ${line}, char ${startChar}, length ${length}`);
            }
        } else {
            color = { red: 0.5, green: 0.5, blue: 0.5, alpha: 1.0 }; // Default color
            if (settings.debug) {
                // connection.console.log(`Default token at line ${line}, char ${startChar}, length ${length}`);
            }
        }

        colorInfo.push({
            range: {
                start: startPos,
                end: endPos
            },
            color: color
        });
    }

    if (settings.debug) {
        connection.console.log(`Completed applying syntax highlighting for document: ${doc.uri.split('/').pop()}`);
    }

    return colorInfo;
}

// Color presentation based on user settings, token types, or any provided format settings
export function provideColorPresentation(params: ColorPresentationParams): ColorPresentation[] {
    const colorPresentation: ColorPresentation = {
        label: `#${Math.round(params.color.red * 255).toString(16)}${Math.round(params.color.green * 255).toString(16)}${Math.round(params.color.blue * 255).toString(16)}`,
        textEdit: undefined,
    };
    return [colorPresentation];
}
