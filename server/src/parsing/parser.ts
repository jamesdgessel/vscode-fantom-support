import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver';
import { tokenLegend, tokenTypes } from '../config/tokenTypes';
import { logMessage } from '../utils/notify';
import { InlineSemanticTokensBuilder } from '../modules/buildTokens';
import { tokenize, Token } from './lexer';
import { ScopeHandler } from './scopeHandler';

export function parseDocument(doc: TextDocument, tokensBuilder: InlineSemanticTokensBuilder, connection: Connection): InlineSemanticTokensBuilder {
    const module = '[PARSER]';
    const tokens: Token[] = tokenize(doc);
    const scopeHandler = new ScopeHandler();

    tokens.forEach(token => {
        const { type, value, line, index } = token;

        switch (type) {
            case 'class':
                logMessage('debug', `class ${value} @ [${line + 1}, ${index}]`, module, connection, "loop");
                tokensBuilder.push(line, index, value.length, tokenLegend.tokenTypes.indexOf(tokenTypes.class), 0);
                scopeHandler.push({ type: 'class', lineStart: line });
                break;
            case 'constructor':
                logMessage('debug', `make ${value} @ [${line + 1}, ${index}]`, module, connection, "loop");
                tokensBuilder.push(line, index, value.length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
                break;
            case 'method':
                logMessage('debug', `method ${value} @ [${line + 1}, ${index}]`, module, connection, "loop");
                tokensBuilder.push(line, index, value.length, tokenLegend.tokenTypes.indexOf(tokenTypes.method), 0);
                scopeHandler.push({ type: 'method', lineStart: line });
                break;
            case 'field':
                if (!scopeHandler.isInMethodScope(line)) {
                    logMessage('debug', `field ${value} @ [${line + 1}, ${index}]`, module, connection, "loop");
                    tokensBuilder.push(line, index, value.length, tokenLegend.tokenTypes.indexOf(tokenTypes.field), 0);
                }
                break;
            case 'openBrace':
                scopeHandler.push({ type: 'block', lineStart: line });
                break;
            case 'closeBrace':
                scopeHandler.pop();
                break;
        }
    });

    return tokensBuilder;
}