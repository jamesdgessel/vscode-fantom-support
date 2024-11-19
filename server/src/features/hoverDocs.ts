import { Hover, HoverParams, Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentTokens } from './buildTokens';
import { runFanFile } from '../utils/fanUtils';
import { tokenLegend } from '../utils/tokenTypes';
import { getSettings } from '../utils/settingsManager';

// Helper function to log debug messages
const logDebug = (settings: ReturnType<typeof getSettings>, connection: Connection, message: string) => {
    if (settings.debug) {
        connection.console.log(message);
    }
};

// Helper function to extract the hovered word based on position
const getHoveredWord = (text: string, offset: number): string => {
    let start = offset;
    let end = offset;

    while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
    }

    while (end < text.length && /\w/.test(text[end])) {
        end++;
    }

    return text.slice(start, end);
};

// Helper function to collect documentation comments above a token
const collectDocComments = (doc: TextDocument, declarationLine: number): string => {
    let docComments = '';
    for (let line = declarationLine - 1; line >= 0; line--) {
        const lineText = doc.getText({
            start: { line, character: 0 },
            end: { line, character: Number.MAX_SAFE_INTEGER }
        }).trim();
        if (lineText.startsWith('**')) {
            docComments = `${lineText}\n${docComments}`;
        } else {
            break;
        }
    }
    return docComments;
};

// Helper function to collect inline comments above a token
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

// Helper function to extract method parameters from a declaration line
const extractMethodParameters = (doc: TextDocument, declarationLine: number, tokenText: string): string[] => {
    const lineText = doc.getText({
        start: { line: declarationLine, character: 0 },
        end: { line: declarationLine, character: Number.MAX_SAFE_INTEGER }
    });
    const methodRegex = new RegExp(`\\b${tokenText}\\b\\s*\\(([^)]*)\\)`);
    const match = methodRegex.exec(lineText);
    if (match && match[1]) {
        // Split parameters by comma and trim whitespace
        return match[1].split(',').map(param => param.trim()).filter(param => param.length > 0);
    }
    return [];
};

// Helper function to find all instances of a word
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

// Helper function to generate markdown links for lines
const generateMarkdownLinks = (lines: number[], fileUri: string): string => {
    return lines.map(line => `[Line ${line + 1}](${fileUri}#L${line + 1})`).join(', ');
};

// Main function to provide hover information
export async function provideHoverInfo(
    params: HoverParams,
    documents: TextDocuments<TextDocument>,
    connection: Connection
): Promise<Hover | null> {
    const settings = getSettings();
    const doc = documents.get(params.textDocument.uri);

    if (!doc) {
        logDebug(settings, connection, 'Document not found.');
        return null;
    }

    const tokens = getDocumentTokens(doc.uri);
    if (!tokens) {
        logDebug(settings, connection, 'No tokens found for document.');
        return null;
    }

    const position = params.position;
    const offset = doc.offsetAt(position);
    const text = doc.getText();
    const hoveredWord = getHoveredWord(text, offset);

    if (!hoveredWord) {
        logDebug(settings, connection, 'No word found at hover position.');
        return null;
    }

    logDebug(settings, connection, `Hovered word: ${hoveredWord}`);

    // Iterate over tokens to find a match
    for (let i = 0; i < tokens.data.length; i += 5) {
        const line = tokens.data[i];
        const character = tokens.data[i + 1];
        const length = tokens.data[i + 2];
        const tokenTypeIndex = tokens.data[i + 3];

        const tokenStart = doc.offsetAt({ line, character });
        const tokenEnd = tokenStart + length;
        const tokenText = text.slice(tokenStart, tokenEnd);

        if (hoveredWord === tokenText) {
            const tokenType = tokenLegend.tokenTypes[tokenTypeIndex];
            const declarationLine = line;

            const docComments = collectDocComments(doc, declarationLine);
            const inlineComments = collectInlineComments(doc, declarationLine);
            const fileUri = params.textDocument.uri;

            let parametersMarkdown = '';
            if (tokenType.toLowerCase().includes('method')) { // Adjust based on actual tokenType
                const parameters = extractMethodParameters(doc, declarationLine, tokenText);
                if (parameters.length > 0) {
                    parametersMarkdown = `**Parameters:** ${parameters.join(', ')}`;
                }
            }

            // Find all instances excluding the declaration
            const instances = findWordInstances(text, hoveredWord, doc).filter(lineNum => lineNum !== declarationLine);
            const uniqueInstances = Array.from(new Set(instances));
            const links = generateMarkdownLinks(uniqueInstances, fileUri);

            // Assemble markdown content with consistent order
            const markdownLines: string[] = [];

            // Declaration Section
            markdownLines.push(`**Declaration:** [Line ${declarationLine + 1}](${fileUri}#L${declarationLine + 1})`);

            // Documentation Comments (fandoc)
            if (docComments) {
                markdownLines.push(docComments);
            }

            // Parameters (for methods)
            if (parametersMarkdown) {
                markdownLines.push(parametersMarkdown);
            }

            // Usage Section
            markdownLines.push(`**Usage:** ${links || 'None'}`);

            // Inline Comments
            if (inlineComments) {
                markdownLines.push(`**Comments:**\n${inlineComments}`);
            }

            // Return Hover for Declaration
            if (declarationLine === position.line) {
                return {
                    contents: {
                        kind: 'markdown',
                        value: markdownLines.join('\n\n')
                    }
                };
            } else {
                // For usages, include Type and ensure consistent order
                const usageMarkdownLines: string[] = [];

                // Type Section
                usageMarkdownLines.push(`**Type:** ${tokenType}`);

                // Declaration Section
                usageMarkdownLines.push(`**Declaration:** [Line ${declarationLine + 1}](${fileUri}#L${declarationLine + 1})`);

                // Documentation Comments (fandoc)
                if (docComments) {
                    usageMarkdownLines.push(docComments);
                }

                // Parameters (for methods)
                if (parametersMarkdown) {
                    usageMarkdownLines.push(parametersMarkdown);
                }

                // Inline Comments
                if (inlineComments) {
                    usageMarkdownLines.push(`**Comments:**\n${inlineComments}`);
                }

                // Usage Section
                usageMarkdownLines.push(`**Usage:** ${links || 'None'}`);

                return {
                    contents: {
                        kind: 'markdown',
                        value: usageMarkdownLines.join('\n\n')
                    }
                };
            }
        }
    }

    // Custom logic if no token matches
    if (/^[a-z]/.test(hoveredWord)) {
        const beforeChar = text[offset - 1] || '';
        const afterChar = text[offset] || '';

        if (beforeChar === '.' || afterChar === '(') {
            logDebug(settings, connection, `Word is preceded by '.' or followed by '('. Performing lookup in Fantom.`);
            return {
                contents: {
                    kind: 'markdown',
                    value: `[Lookup ${hoveredWord} in Fantom](#)`
                }
            };
        }

        const instances = findWordInstances(text, hoveredWord, doc);
        if (instances.length > 0) {
            const uniqueInstances = Array.from(new Set(instances));
            const fileUri = params.textDocument.uri;
            const links = generateMarkdownLinks(uniqueInstances, fileUri);

            logDebug(settings, connection, `Found instances for word: ${hoveredWord}`);

            // Check for declaration on the same line
            const lineText = doc.getText({
                start: { line: position.line, character: 0 },
                end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
            });

            const declarationRegex = new RegExp(`\\b${hoveredWord}\\b\\s*(?::=|\\(.*\\))`);
            const hasDeclaration = declarationRegex.test(lineText);

            // Check if the word is part of a method
            const methodMatch = lineText.match(new RegExp(`\\b${hoveredWord}\\b\\s*\\(([^)]*)\\)`));
            let parametersMarkdown = '';
            if (methodMatch && methodMatch[1]) {
                const parameters = methodMatch[1].split(',').map(param => param.trim()).filter(param => param.length > 0);
                if (parameters.length > 0) {
                    parametersMarkdown = `**Parameters:** ${parameters.join(', ')}`;
                }
            }

            let docComments = '';
            let inlineComments = '';

            if (hasDeclaration) {
                // Find the declaration line
                const declarationLineMatch = text.split('\n').findIndex((line, idx) => {
                    const regex = new RegExp(`\\b${hoveredWord}\\b\\s*(?::=|\\(.*\\))`);
                    return regex.test(line) && idx === position.line;
                });
                if (declarationLineMatch !== -1) {
                    docComments = collectDocComments(doc, declarationLineMatch);
                    inlineComments = collectInlineComments(doc, declarationLineMatch);
                }
            }

            if (hasDeclaration) {
                // Assemble markdown content with consistent order
                const markdownLines: string[] = [];

                // Usage Section
                markdownLines.push(`**Usage:** ${links || 'None'}`);

                // Documentation Comments (fandoc)
                if (docComments) {
                    markdownLines.push(docComments);
                }

                // Parameters (for methods)
                if (parametersMarkdown) {
                    markdownLines.push(parametersMarkdown);
                }

                // Inline Comments
                if (inlineComments) {
                    markdownLines.push(`**Comments:**\n${inlineComments}`);
                }

                return {
                    contents: {
                        kind: 'markdown',
                        value: markdownLines.join('\n\n')
                    }
                };
            } else {
                // Attempt to collect comments if it's a method
                const currentLine = position.line;
                docComments = collectDocComments(doc, currentLine);
                inlineComments = collectInlineComments(doc, currentLine);

                // Assemble markdown content with consistent order
                const markdownLines: string[] = [];

                // Usage Section
                markdownLines.push(`**Usage:** ${links || 'None'}`);

                // Documentation Comments (fandoc)
                if (docComments) {
                    markdownLines.push(docComments);
                }

                // Parameters (for methods)
                if (parametersMarkdown) {
                    markdownLines.push(parametersMarkdown);
                }

                // Inline Comments
                if (inlineComments) {
                    markdownLines.push(`**Comments:**\n${inlineComments}`);
                }

                return {
                    contents: {
                        kind: 'markdown',
                        value: markdownLines.join('\n\n')
                    }
                };
            }
        }
    }

    // Default "lookup in Fantom" if no other conditions are met
    logDebug(settings, connection, `No token for ${hoveredWord}`);
    return {
        contents: {
            kind: 'markdown',
            value: `[Lookup ${hoveredWord} in Fantom](#)`
        }
    };
}
