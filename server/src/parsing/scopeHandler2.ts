import { logMessage } from '../utils/notify'; // Utility for logging messages
import { TextDocument } from 'vscode'; // VSCode TextDocument interface
import { readFileSync } from 'fs'; // Use named import for better clarity
import { fantomTokenRegex, tokenTypes, tokenLegend } from '../config/tokenTypes';

const MODULE_NAME = '[SCOPE_HANDLER]'; 

enum ScopeType {
  Class = 'CLASS',
  Method = 'METHOD',
  Function = 'FUNCTION',
  Block = 'BLOCK'
}

export class Scope {
  
  public startIndex: [number, number];
  public endIndex?: [number, number];
  public type: ScopeType;
  public signature: string;
  public scopeLevel: number = 0;
  public parent?: Scope;
  public children: Scope[] = [];

  constructor(
    start: [number, number],
    signature: string,
    type: ScopeType = ScopeType.Block,
    parent?: Scope
  ) {
    this.startIndex = start;
    this.signature = signature;
    this.type = type;
    this.parent = parent;
  }

  endScope(end: [number, number]): void {
    this.endIndex = end;
  }

  addChild(child: Scope): void {
    this.children.push(child);
  }
}

export class DocumentScopes {
  private scopeStack: Scope[] = [new Scope([0, 0], 'root', ScopeType.Block)];
  public scopes: Scope[] = [];

  constructor(doc: TextDocument) {
    this.scopes.push(this.scopeStack[0]);
    this.buildBlockScopes(doc);
  }

  /**
   * Builds all scopes based on matching {} pairs within the document.
   * Optimized for better performance and readability.
   * @param doc - The TextDocument to analyze.
   */
  buildBlockScopes(doc: TextDocument): void {
    const text = doc.getText();
    const lines = text.split(/\r?\n/);

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const line = lines[lineNumber];
      let inString = false;
      let stringChar = '';
      let inComment = false;
      let escapeNext = false;

      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        const prevChar = charIndex > 0 ? line[charIndex - 1] : '';

        // Handle string literals and comments
        if (inString) {
          if (char === stringChar && !escapeNext) {
            inString = false;
            stringChar = '';
          }
          escapeNext = char === '\\' && !escapeNext;
          continue;
        } else if (inComment) {
          break; // Ignore the rest of the line if in a comment
        } else {
          if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
            continue;
          }
          if (prevChar === '/' && (char === '/' || char === '*')) {
            inComment = true;
            continue;
          }
        }

        // Handle scope characters, prioritize '{' only
        if (char === '{') {
          const signature = this.extractSignature(lines, lineNumber, charIndex);
          const type = this.determineScopeType(signature, char);
          const parentScope = this.scopeStack[this.scopeStack.length - 1];
          const newScope = new Scope([lineNumber, charIndex], signature, type, parentScope);
          parentScope.addChild(newScope);
          this.scopeStack.push(newScope);
          logMessage('debug', `Opened ${type} scope at ${newScope.startIndex}: ${signature}`, MODULE_NAME);
        } else if (char === '}') {
          const scope = this.scopeStack.pop();
          if (scope) {
            scope.endScope([lineNumber, charIndex]);
            this.scopes.push(scope);
            logMessage('debug', `Closed ${scope.type} scope from ${scope.startIndex} to ${scope.endIndex}`, MODULE_NAME);
          } else {
            logMessage(
              'warn',
              `Unmatched closing brace at line ${lineNumber + 1}, character ${charIndex + 1}`,
              MODULE_NAME
            );
          }
        }
      }
    }

    // Handle any unclosed scopes
    while (this.scopeStack.length > 1) { // The root scope remains
      const unclosedScope = this.scopeStack.pop();
      if (unclosedScope) {
        this.scopes.push(unclosedScope);
      }
      logMessage('warn', `Unclosed scope starting at ${unclosedScope?.startIndex}`, MODULE_NAME);
    }
  }

  /**
   * Extracts the signature of the scope based on its starting position.
   * This method can be enhanced to parse the actual code and determine the signature.
   * @param lines - All lines of the document.
   * @param lineNumber - The current line number.
   * @param charIndex - The current character index.
   * @returns A string representing the scope's signature.
   */
  private extractSignature(lines: string[], lineNumber: number, charIndex: number): string {
    // Check if there's only whitespace before '{'
    const beforeChar = lines[lineNumber].substring(0, charIndex);
    if (/^\s*$/.test(beforeChar)) {
        // Use the previous line as the initial signature
        if (lineNumber > 0) {
            return this.extractSignature(lines, lineNumber - 1, lines[lineNumber - 1].length);
        }
    }

    // Get text on current line before charIndex, excluding '{'
    let signature = lines[lineNumber].substring(0, charIndex).replace(/\{$/, '').trim();

    // If there is a ')' without a '(', search back lines to get text within '()'
    if (signature.includes(')') && !signature.includes('(')) {
        let collected = '';
        let i = lineNumber - 1;
        while (i >= 0) {
            const line = lines[i].trim();
            collected = line + ' ' + collected;
            if (line.includes('(')) {
                break;
            }
            i--;
        }
        const match = collected.match(/\(([^)]+)\)/);
        if (match) {
            signature = match[1].trim();
        }
    }

    // If signature line contains ';', '{', or '=', get text after these characters
    const lastSemicolon = signature.lastIndexOf(';');
    const lastBrace = signature.lastIndexOf('{');
    const lastEquals = signature.lastIndexOf('=');
    // const lastPar = signature.lastIndexOf('(');
    const lastIndex = Math.max(lastSemicolon, lastBrace, lastEquals);
    if (lastIndex !== -1) {
        signature = signature.substring(lastIndex + 1).trim();
    }

    return signature;
  }

  /**
   * Determines the type of the scope based on its signature.
   * @param signature - The signature of the scope.
   * @param openingChar - The opening character of the scope.
   * @returns The corresponding ScopeType.
   */
  private determineScopeType(signature: string, openingChar: string): ScopeType {
    if (fantomTokenRegex.classPattern.test(signature)) return ScopeType.Class;
    else if (fantomTokenRegex.methodPattern.test(signature)) return ScopeType.Method;
    // else if (fantomTokenRegex.functionPattern.test(signature)) return ScopeType.Function;
    else return ScopeType.Block;
  }

  /**
   * Prints all collected scopes to the console in a readable hierarchical format.
   */
  public printScopes(): void {
    console.log('--------------------------------------------------------------------------')

    const printScope = (scope: Scope, indent: number) => {
      const paddedStartIndex = `${' '.repeat(indent)}${scope.type} [${scope.startIndex}] - [${scope.endIndex}]`;
      const paddedSignature = `${' '.repeat(indent)}${scope.signature}`;
      console.log(`${paddedStartIndex} ${paddedSignature}`);
      scope.children.forEach(child => printScope(child, indent + 1));
    };

    this.scopes
      .filter(scope => !scope.parent)
      .forEach(scope => printScope(scope, 0));
  }
}

// Mock TextDocument for testing
const mockTextDocument = {
  getText: () => readFileSync('../../test/example.fan', 'utf-8'),
} as TextDocument;
const documentScopes = new DocumentScopes(mockTextDocument);
documentScopes.printScopes(); // Print the collected scopes

// Output the collected scopes
// console.log('Collected Scopes:', documentScopes.scopes);
