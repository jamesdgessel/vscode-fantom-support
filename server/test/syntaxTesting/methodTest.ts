import { expect } from 'chai';
import { buildSemanticTokens } from '../../src/modules/buildTokens';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { mockConnection } from '../mockConnection';

describe('Method Syntax Tests', () => {
    function createTextDocument(content: string): TextDocument {
        return TextDocument.create('test://test/test.fan', 'fantom', 1, content);
    }

    

    it('should parse a simple method correctly', async () => {
        const code = `
        class Test {
            Void simpleMethod() {
                // method body
            }
        }`;
        const doc = createTextDocument(code);
        const tokens = await buildSemanticTokens(doc, mockConnection);
        expect(tokens.data).to.include.members([1, 12, 12, 1, 0]); // Example token data check
    });

    it('should parse a method with parameters correctly', async () => {
        const code = `
        class Test {
            Int methodWithParams(Int a, Str b) {
                // method body
            }
        }`;
        const doc = createTextDocument(code);
        const tokens = await buildSemanticTokens(doc, mockConnection);
        expect(tokens.data).to.include.members([1, 12, 16, 1, 0]); // Example token data check
    });

    it('should parse a method with a list return type', async () => {
        const code = `
        class Test {
            Str[] complexReturnTypeMethod() {
                // method body
            }
        }`;
        const doc = createTextDocument(code);
        const tokens = await buildSemanticTokens(doc, mockConnection);
        expect(tokens.data).to.include.members([1, 12, 24, 1, 0]); // Example token data check
    });

    it('should parse a method with a complex return type', async () => {
        const code = `
        class Test {
            [Str?:Obj?]? complexReturnTypeMethod() {
                // method body
            }
        }`;
        const doc = createTextDocument(code);
        const tokens = await buildSemanticTokens(doc, mockConnection);
        expect(tokens.data).to.include.members([1, 12, 24, 1, 0]); // Example token data check
    });

    // ...additional tests for other method syntax scenarios...
});
