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
    InClass,
    InMethod,
    InBlock
}

export class Lexer {
    private state: LexerState = LexerState.Default;
    private tokens: Token[] = [];
    private lines: string[] = [];
    private braceStack: LexerState[] = [];

    constructor(private doc: TextDocument) {
        this.lines = doc.getText().split(/\r?\n/);
    }

    private addToken(type: string, value: string, line: number, index: number) {
        this.tokens.push({ type, value, line, index });
    }

    private handleLine(line: string, lineIndex: number) {
        let match;

        // Reset regex indexes
        fantomTokenRegex.classPattern.lastIndex = 0;
        fantomTokenRegex.methodPattern.lastIndex = 0;
        fantomTokenRegex.fieldPattern.lastIndex = 0;

        // Match classes
        if ((match = fantomTokenRegex.classPattern.exec(line)) !== null) {
            const captureIndex = match.index + match[0].indexOf(match[1]);
            this.addToken('class', match[1], lineIndex, captureIndex);
            this.state = LexerState.InClass;
            // Brace will be handled when we encounter '{'
        }

        // Match methods
        if (this.state === LexerState.InClass || this.state === LexerState.InMethod) {
            while ((match = fantomTokenRegex.methodPattern.exec(line)) !== null) {
                const captureIndex = match.index + match[0].indexOf(match[1]);
                this.addToken('method', match[1], lineIndex, captureIndex);
                this.state = LexerState.InMethod;
                // Wait for '{' to push to braceStack
            }
        }

        // // Match constructors
        // if (this.state === LexerState.InClass) {
        //     while ((match = /(?:new\s+)(make)/gm.exec(line)) !== null) {
        //     const captureIndex = match.index + match[0].indexOf(match[1]);
        //     this.addToken('constructor', match[1], lineIndex, captureIndex);
        //     this.state = LexerState.InMethod; // Treat constructors like methods
        //     // Wait for '{' to push to braceStack
        //     }
        // }

        // Match fields
        if (this.state === LexerState.InClass) {
            while ((match = fantomTokenRegex.fieldPattern.exec(line)) !== null) {
                const captureIndex = match.index + match[0].indexOf(match[1]);
                this.addToken('field', match[1], lineIndex, captureIndex);
            }
        }

        // Handle braces
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '{') {
                this.addToken('openBrace', '{', lineIndex, i);
                // Push the current state to the brace stack
                this.braceStack.push(this.state);

                if (this.state === LexerState.InMethod) {
                    this.state = LexerState.InBlock;
                } else if (this.state === LexerState.InClass) {
                    // No state change needed; we're inside a class
                }
            } else if (char === '}') {
                this.addToken('closeBrace', '}', lineIndex, i);
                if (this.braceStack.length > 0) {
                    const lastState = this.braceStack.pop() ?? LexerState.Default;

                    if (this.state === LexerState.InBlock) {
                        // Exiting a block, restore to method state
                        this.state = lastState;
                    } else if (this.state === LexerState.InMethod) {
                        // Exiting a method, restore to class state
                        this.state = lastState;
                    } else if (this.state === LexerState.InClass) {
                        // Exiting a class, restore to previous state
                        this.state = lastState;
                    }
                } else {
                    console.warn(`Unmatched closing brace at line ${lineIndex + 1}`);
                    this.state = LexerState.Default; // Reset state on unmatched brace
                }
            }
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
