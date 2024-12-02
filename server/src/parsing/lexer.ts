import { TextDocument } from 'vscode-languageserver-textdocument';
import { fantomTokenRegex } from '../config/tokenTypes';

export interface Token {
    type: string;
    value: string;
    line: number;
    index: number;
}

enum LexerState {
    Default,
    InMethod,
    InClass,
    InBlock
}

export class Lexer {
    private state: LexerState = LexerState.Default;
    private tokens: Token[] = [];
    private lines: string[] = [];

    constructor(private doc: TextDocument) {
        this.lines = doc.getText().split(/\r?\n/);
    }

    private addToken(type: string, value: string, line: number, index: number) {
        this.tokens.push({ type, value, line, index });
    }

    private handleLine(line: string, lineIndex: number) {
        let match;

        switch (this.state) {
            case LexerState.Default:
                // Match classes
                if ((match = fantomTokenRegex.classPattern.exec(line)) !== null) {
                    const captureIndex = match.index + match[0].indexOf(match[1]);
                    this.addToken('class', match[1], lineIndex, captureIndex);
                    this.state = LexerState.InClass;
                }
                break;

            case LexerState.InClass:
                // Match constructor
                if ((match = /(?:new\s+)(make)/gm.exec(line)) !== null) {
                    const captureIndex = match.index + match[0].indexOf(match[1]);
                    this.addToken('constructor', match[1], lineIndex, captureIndex);
                }

                // Match methods
                while ((match = fantomTokenRegex.methodPattern.exec(line)) !== null) {
                    this.addToken('method', match[1], lineIndex, match.index);
                    this.state = LexerState.InMethod;
                }

                // Match fields
                while ((match = fantomTokenRegex.fieldPattern.exec(line)) !== null) {
                    this.addToken('field', match[1], lineIndex, match.index);
                }
                break;

            case LexerState.InMethod:
                // Check for methods where { starts on the next line
                if (line.trim().startsWith('{')) {
                    this.state = LexerState.InBlock;
                }
                break;

            case LexerState.InBlock:
                // Handle block-specific logic if needed
                break;
        }

        // Handle braces
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;

        for (let i = 0; i < openBraces; i++) {
            this.addToken('openBrace', '{', lineIndex, line.indexOf('{'));
        }

        for (let i = 0; i < closeBraces; i++) {
            this.addToken('closeBrace', '}', lineIndex, line.indexOf('}'));
        }
    }

    public tokenize(): Token[] {
        this.lines.forEach((line, lineIndex) => {
            this.handleLine(line, lineIndex);
        });

        return this.tokens;
    }
}

export function tokenize(doc: TextDocument): Token[] {
    const lexer = new Lexer(doc);
    return lexer.tokenize();
}