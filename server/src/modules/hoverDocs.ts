import { Hover, HoverParams, Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { tokenLegend } from '../config/tokenTypes';
import { getSettings } from '../config/settingsHandler';
import { FantomDocs } from '../modules/fantomDocs'; 
import { logMessage } from '../utils/notify'; // Import logMessage


/**
 * Extracts the word under the cursor based on the provided offset.
 * @param text - The entire text of the document.
 * @param offset - The character offset of the cursor position.
 * @returns An object containing the hovered word and its start offset.
 */
const getHoveredWord = (text: string, offset: number): { word: string; start: number } => {
    let start = offset;
    let end = offset;

    // Expand to the start of the word
    while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
    }

    // Expand to the end of the word
    while (end < text.length && /\w/.test(text[end])) {
        end++;
    }

    const word = text.slice(start, end);
    return { word, start };
};

/**
 * Collects documentation comments (fandoc) above a token declaration.
 * @param doc - The text document.
 * @param declarationLine - The line number where the token is declared.
 * @returns The concatenated documentation comments with '**' replaced by '\n\n'.
 */
const collectDocComments = (doc: TextDocument, declarationLine: number): string => {
    let docComments = '';
    for (let line = declarationLine - 1; line >= 0; line--) {
        const lineText = doc.getText({
            start: { line, character: 0 },
            end: { line, character: Number.MAX_SAFE_INTEGER }
        }).trim();
        if (lineText.startsWith('**')) {
            // Replace '**' with '\n\n' and accumulate
            const cleanedLine = lineText.replace(/\*\*/g, '\n\n');
            docComments = `${cleanedLine}\n${docComments}`;
        } else {
            break;
        }
    }
    return docComments;
};

/**
 * Collects inline comments above a token declaration.
 * @param doc - The text document.
 * @param declarationLine - The line number where the token is declared.
 * @returns The concatenated inline comments.
 */
const collectInlineComments = (doc: TextDocument, declarationLine: number): string => {
    let inlineComments = '';
    for (let line = declarationLine - 1; line >= 0; line--) {
        const lineText = doc.getText({
            start: { line, character: 0 },
            end: { line, character: Number.MAX_SAFE_INTEGER }
        }).trim();
        if (lineText.startsWith('//')) {
            // Remove the '//' and trim the comment
            inlineComments = `${lineText.substring(2).trim()}\n${inlineComments}`;
        } else if (lineText === '') {
            // Allow empty lines between comments
            continue;
        } else {
            break;
        }
    }
    return inlineComments;
};

/**
 * Finds all instances of a word within the document and returns their line numbers.
 * @param text - The entire text of the document.
 * @param word - The word to search for.
 * @param doc - The text document.
 * @returns An array of line numbers where the word is found.
 */
const findWordInstances = (text: string, word: string, doc: TextDocument): number[] => {
    const instances: number[] = [];
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        const matchOffset = match.index;
        const matchPosition = doc.positionAt(matchOffset);
        instances.push(matchPosition.line);
    }

    return instances;
};

/**
 * Generates markdown-formatted links for the provided line numbers.
 * @param lines - An array of line numbers.
 * @param fileUri - The URI of the file.
 * @returns A string of markdown links separated by commas.
 */
const generateMarkdownLinks = (lines: number[], fileUri: string): string => {
    return lines.map(line => `[Line ${line + 1}](${fileUri}#L${line + 1})`).join(', ');
};

/**
 * Provides hover information for a given position in the document.
 * @param params - The hover parameters.
 * @param documents - The collection of text documents.
 * @param connection - The language server connection.
 * @returns A Hover object containing the markdown information or null.
 */
export async function provideHoverInfo(
    fantom: FantomDocs,
    params: HoverParams,
    documents: TextDocuments<TextDocument>,
    connection: Connection
): Promise<Hover | null> {
    const module = '[HOVER]';
    const settings = getSettings();
    const doc = documents.get(params.textDocument.uri);

    if (!doc) {
        logMessage('warn', 'Document not found.', module, connection);
        return null;
    }

    const tokens = getDocumentTokens(doc.uri);
    if (!tokens) {
        logMessage('warn', 'No tokens found.', module, connection);
        return null;
    }

    const position = params.position;
    const offset = doc.offsetAt(position);
    const text = doc.getText();
    const { word: hoveredWord, start: wordStart } = getHoveredWord(text, offset);

    if (!hoveredWord) {
        logMessage('debug', 'No word at hover position.', module, connection);
        return null;
    }

    logMessage('debug', `Hovered word: ${hoveredWord}`, module, connection, "start");

    // Check if the word starts with a capital letter or is prefixed with '.'
    const isCapitalized = /^[A-Z]/.test(hoveredWord);
    const isPrefixedWithDot = wordStart > 0 && text[wordStart - 1] === '.';

    if (isCapitalized || isPrefixedWithDot) {
        try {
            const fantomResult = await fantom.fanDocLookup(hoveredWord);
            return {
                contents: {
                    kind: 'markdown',
                    value: fantomResult
                }
            };
        } catch (error) {
            logMessage('err', `Fantom lookup failed: ${error}`, module, connection);
            return {
                contents: {
                    kind: 'markdown',
                    value: `**Error:** Unable to lookup "${hoveredWord}" in Fantom.\n\nDetails: ${error}`
                }
            };
        }
    }

    // Iterate over tokens to find a match
    for (let i = 0; i < tokens.data.length; i += 5) {
        const line = tokens.data[i];
        const character = tokens.data[i + 1];
        const length = tokens.data[i + 2];
        const tokenTypeIndex = tokens.data[i + 3];
        const scope = String(tokens.data[i + 4]); // Ensure scope is string

        const tokenStart = doc.offsetAt({ line, character });
        const tokenEnd = tokenStart + length;
        const tokenText = text.slice(tokenStart, tokenEnd);

        if (hoveredWord === tokenText) {
            // Check if the token has the 'entity.name.function' scope
            const isFunctionEntity = scope === 'entity.name.function';

            if (isFunctionEntity) {
                try {
                    const fantomResult = await fantom.fanDocLookup(hoveredWord);
                    return {
                        contents: {
                            kind: 'markdown',
                            value: fantomResult
                        }
                    };
                } catch (error) {
                    logMessage('err', `Fantom lookup failed: ${error}`, module, connection);
                    return {
                        contents: {
                            kind: 'markdown',
                            value: `**Error:** Unable to lookup "${hoveredWord}" in Fantom.\n\nDetails: ${error}`
                        }
                    };
                }
            }

            const tokenType = tokenLegend.tokenTypes[tokenTypeIndex];
            const declarationLine = line;

            const docComments = collectDocComments(doc, declarationLine);
            const inlineComments = collectInlineComments(doc, declarationLine);
            const fileUri = params.textDocument.uri;

            // Find all instances excluding the declaration
            const instances = findWordInstances(text, hoveredWord, doc).filter(lineNum => lineNum !== declarationLine);
            const uniqueInstances = Array.from(new Set(instances));
            const usageLines = uniqueInstances.map(lineNum => lineNum + 1); // Convert to 1-based indexing
            const links = generateMarkdownLinks(uniqueInstances, fileUri);

            // Get the entire declaration line text
            const declarationLineText = doc.getText({
                start: { line: declarationLine, character: 0 },
                end: { line: declarationLine, character: Number.MAX_SAFE_INTEGER }
            }).trim();

            // Assemble markdown content with consistent order
            const markdownLines: string[] = [];

            // Documentation Comments (fandoc) - preserve new lines
            if (docComments) {
                markdownLines.push(docComments);
            }

            // Inline Comments
            if (inlineComments) {
                markdownLines.push(`**Comments:**\n${inlineComments}`);
            }

            // Declaration Line Text in code block with syntax highlighting
            markdownLines.push(`\`\`\`typescript\n${declarationLineText}\n\`\`\``);

            // Consolidated Type and Declaration Line with Usage
            if (usageLines.length > 0) {
                markdownLines.push(`${tokenType} decl: [Line ${declarationLine + 1}](${fileUri}#L${declarationLine + 1}), used: [${usageLines.join(', ')}]`);
            } else {
                markdownLines.push(`${tokenType} decl: [Line ${declarationLine + 1}](${fileUri}#L${declarationLine + 1}), used: None`);
            }

            return {
                contents: {
                    kind: 'markdown',
                    value: markdownLines.join('\n\n')
                }
            };
        }
    }

    // If no token matches, return null or default hover
    logMessage('debug', `No matching token for "${hoveredWord}"`, module, connection, "end");
    return null;
}
