import { SemanticTokens, Connection, DocumentSymbol, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { tokenLegend } from '../config/tokenTypes';
import { getSettings } from '../config/settingsHandler';
import { buildOutline } from './codeOutline';
import { logMessage } from '../utils/notify';
import { parseDocument } from '../parsing/parser'; // Import the new parser module

// Global storage for tokens to allow other features to access pre-built tokens
const documentTokens = new Map<string, SemanticTokens>();

// Main function to build and store tokens
export async function buildSemanticTokens(doc: TextDocument, connection: Connection): Promise<SemanticTokens> {
    const module = '[TOKENS]';
    const settings = await getSettings();
    const tokensBuilder = new InlineSemanticTokensBuilder();

    logMessage('debug', `Building tokens for ${doc.uri.split('/').pop()}`, module, connection);

    const tokens = parseDocument(doc, tokensBuilder, connection); // Use the new parser module

    if (tokens.data.length === 0) {
        logMessage('warn', `No tokens found for document: ${doc.uri.split('/').pop()}, returning empty tokens.`, module, connection);
        return { data: [] };
    }

    logMessage('debug', `Tokens built for ${doc.uri.split('/').pop()}`, module, connection);
    // connection.console.log(`[DEBUG] SEM TOK: ${JSON.stringify(tokens)}`);

    documentTokens.set(doc.uri, tokens);
    return tokens;
}

// Retrieves pre-built tokens for other features
export function getDocumentTokens(uri: string): SemanticTokens | undefined {
    return documentTokens.get(uri);
}

// Clears stored tokens when a document is closed
export function clearDocumentTokens(uri: string): void {
    documentTokens.delete(uri);
}

// Inline builder class to manage token building
export class InlineSemanticTokensBuilder {
    public data: number[] = []; // Change private to public

    push(line: number, startChar: number, length: number, tokenType: number, tokenModifiers: number) {
        this.data.push(line, startChar, length, tokenType, tokenModifiers);
    }

    build(): SemanticTokens {
        return { data: this.data };
    }
}

// Provide document symbols in the required format for onDocumentSymbol
export async function provideDocumentSymbols(uri: string, connection: Connection, documents: TextDocuments<TextDocument>): Promise<DocumentSymbol[] | undefined> {
    const module = '[SYMBOLS]';
    const settings = await getSettings();
    const doc = documents.get(uri);

    if (!doc) {
        logMessage('err', `Document not found: ${uri}`, module, connection);
        return undefined;
    }

    logMessage('debug', `Requesting doc symbols for ${uri.split('/').pop()}`, module, connection, "start");

    const symbols = await buildOutline(doc, connection);

    if (!symbols || symbols.length === 0) {
        logMessage('warn', `No symbols generated for ${uri.split('/').pop()}`, module, connection);
        return undefined;
    }

    logMessage('debug', `[Generated symbols for ${uri.split('/').pop()}`, module, connection, "end");

    return symbols;
}
