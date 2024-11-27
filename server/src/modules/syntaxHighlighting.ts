import { Connection, DocumentColorParams, ColorInformation, ColorPresentation, ColorPresentationParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { tokenLegend } from '../config/tokenTypes';
import { getSettings } from '../config/settingsHandler';
import { logMessage } from '../utils/notify';

// Retrieves color information based on pre-built tokens and settings
export function applySyntaxHighlighting(doc: TextDocument, connection: Connection): ColorInformation[] {
    const module = 'applySyntaxHighlighting';
    logMessage('debug', `Start highlighting: ${doc.uri.split('/').pop()}`, module, connection);
    const settings = getSettings(); // Retrieve settings for syntax highlighting
    logMessage('debug', `Settings retrieved`, module, connection);
    const tokens = getDocumentTokens(doc.uri);
    logMessage('debug', `Tokens retrieved`, module, connection);
    if (!tokens) {
        logMessage('info', `No tokens for: ${doc.uri.split('/').pop()}`, module, connection);
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

        // Determine color based on token type and settings
        let color = { red: 0.2, green: 0.4, blue: 0.8, alpha: 1.0 };
 

        logMessage('debug', `Color set`, module, connection);

        colorInfo.push({
            range: {
                start: startPos,
                end: endPos
            },
            color: color
        });
    }

    logMessage('info', `Completed highlighting: ${doc.uri.split('/').pop()}`, module, connection);

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
