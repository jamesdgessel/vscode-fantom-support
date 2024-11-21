// import {
//     SemanticTokensBuilder,
//     SemanticTokensParams,
//     Position
// } from 'vscode-languageserver/node';
// import { TextDocument } from 'vscode-languageserver-textdocument';
// import { findStringRanges, getWordRangeAtPosition, isPositionInRanges } from './utils';

// interface Token {
//     line: number;
//     character: number;
//     length: number;
//     tokenType: number;
//     tokenModifiers: number;
// }

// // Map to track variable symbols and positions per document
// const variableSymbols: Map<string, Map<string, Position[]>> = new Map();

// function buildSemanticTokens(document: TextDocument, settings: { highlightVariableDeclarations: boolean, highlightVariableUsage: boolean }): { data: number[] } {
//     if (!settings.highlightVariableDeclarations && !settings.highlightVariableUsage) {
//         return { data: [] };
//     }

//     const tokensBuilder = new SemanticTokensBuilder();
//     const uri = document.uri;
//     const docVariableSymbols = variableSymbols.get(uri);
//     if (!docVariableSymbols) {
//         return { data: [] };
//     }

//     const text = document.getText();
//     const stringRanges = findStringRanges(text, document);

//     // Collect all tokens
//     const allTokens: Token[] = [];

//     docVariableSymbols.forEach((positions, variableName) => {
//         positions.forEach(position => {
//             const wordRange = getWordRangeAtPosition(document, position);
//             if (wordRange && document.getText(wordRange) === variableName) {
//                 if (isPositionInRanges(position, stringRanges)) {
//                     return; 
//                 }

//                 if (settings.highlightVariableDeclarations || !isVariableDeclaration(position, text)) {
//                     allTokens.push({
//                         line: position.line,
//                         character: position.character,
//                         length: variableName.length,
//                         tokenType: 0,
//                         tokenModifiers: 0
//                     });
//                 }
//             }
//         });
//     });

//     allTokens.sort((a, b) => {
//         if (a.line !== b.line) {
//             return a.line - b.line;
//         }
//         return a.character - b.character;
//     });

//     allTokens.forEach(token => {
//         tokensBuilder.push(
//             token.line,
//             token.character,
//             token.length,
//             token.tokenType,
//             token.tokenModifiers
//         );
//     });

//     return tokensBuilder.build();
// }

// /**
//  * Determines if a position is a variable declaration.
//  * @param position The Position to check.
//  * @param text The full text of the document.
//  * @returns True if the position is a variable declaration; otherwise, false.
//  */
// function isVariableDeclaration(position: Position, text: string): boolean {
//     const lines = text.split('\n');
//     const line = lines[position.line];
//     const variablePattern = /\b(\w+)\b(?=\s*:=)/g;
//     let match: RegExpExecArray | null;
//     while ((match = variablePattern.exec(line)) !== null) {
//         if (match.index === position.character) {
//             return true;
//         }
//     }
//     return false;
// }

// export { buildSemanticTokens, isVariableDeclaration, Token };
