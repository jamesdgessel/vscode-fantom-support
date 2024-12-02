import { Connection, DocumentColorParams, ColorInformation, ColorPresentation, ColorPresentationParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { tokenLegend } from '../config/tokenTypes';
import { getSettings } from '../config/settingsHandler';
import { logMessage } from '../utils/notify';

// Retrieves color information based on pre-built tokens and settings
export async function applySyntaxHighlighting(doc: TextDocument, connection: Connection): Promise<ColorInformation[]> {
    const module = '[SNTX HLGHT]';
    logMessage('debug', `Start highlighting: ${doc.uri.split('/').pop()}`, module, connection,"start");
    const settings = await getSettings(); // Retrieve settings for syntax highlighting
    logMessage('debug', `Settings retrieved`, module, connection);
    const tokens = await getDocumentTokens(doc.uri);
    logMessage('debug', `Tokens retrieved`, module, connection);
    if (!tokens) {
        logMessage('warn', `No tokens for: ${doc.uri.split('/').pop()}`, module, connection);
        return [];
    }

    const colorInfo: ColorInformation[] = [];

    logMessage('info', `Highlighting: ${doc.uri.split('/').pop()}`, module, connection);

    // Loop through tokens and apply highlighting based on token types and settings
    for (let i = 0; i < tokens.data.length; i += 5) {
        const line = tokens.data[i];
        const startChar = tokens.data[i + 1];
        const length = tokens.data[i + 2];
        const tokenTypeIndex = tokens.data[i + 3];

        const tokenType = tokenLegend.tokenTypes[tokenTypeIndex];
        const startPos = { line, character: startChar };
        const endPos = { line, character: startChar + length };

        logMessage('debug', `Token: ${tokenType} at line ${line}`, module, connection);

        // Temporarily set all tokens to red color
        let color = { red: 1.0, green: 0.0, blue: 0.0, alpha: 1.0 };

        logMessage('debug', `Color set`, module, connection);

        colorInfo.push({
            range: {
                start: startPos,
                end: endPos
            },
            color: color
        });
    }

    logMessage('info', `Completed highlighting: ${doc.uri.split('/').pop()}`, module, connection,"end");

    // Send the color information to the client
    connection.sendNotification('textDocument/publishDiagnostics', {
        uri: doc.uri,
        diagnostics: colorInfo
    });

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
