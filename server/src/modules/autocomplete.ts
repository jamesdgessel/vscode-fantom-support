import { CompletionItem, CompletionItemKind, CompletionParams, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver/node';
import { logMessage } from '../utils/notify';
import { getSettings } from '../utils/settingsHandler';

// Get settings from settings manager
const settings = getSettings();

// Fantom-specific autocomplete items
const completionItems: CompletionItem[] = [
    {
        label: 'class',
        kind: CompletionItemKind.Keyword,
        detail: 'Class Declaration',
        documentation: 'Defines a new class in Fantom. Example:\n\n`class MyClass {}`',
        insertText: 'class ${1:ClassName} {\n\t$0\n}',
        insertTextFormat: 2 // Snippet format with placeholders
    },
    {
        label: 'method',
        kind: CompletionItemKind.Snippet,
        detail: 'Method Declaration',
        documentation: 'Defines a new method in a class. Example:\n\n`Void myMethod() {}`',
        insertText: 'Void ${1:methodName}() \n{\n\t$0\n}',
        insertTextFormat: 2
    },
    {
        label: 'const',
        kind: CompletionItemKind.Keyword,
        detail: 'Constant Declaration',
        documentation: 'Defines a constant variable in Fantom. Example:\n\n`const Str myConst := "value"`',
        insertText: 'const ${1:Type} ${2:name} := ${3:value};',
        insertTextFormat: 2
    },
    {
        label: 'echo',
        kind: CompletionItemKind.Function,
        detail: 'Prints output to console',
        documentation: 'Prints a string to the console. Example:\n\n`echo("Hello, World!")`',
        insertText: 'echo(${1:"message"});',
        insertTextFormat: 2
    },
    {
        label: 'if',
        kind: CompletionItemKind.Keyword,
        detail: 'If Statement',
        documentation: 'Conditional if statement in Fantom. Example:\n\n`if (condition) { }`',
        insertText: 'if (${1:condition}) \n{\n\t$0\n}',
        insertTextFormat: 2
    },
    {
        label: 'for',
        kind: CompletionItemKind.Keyword,
        detail: 'For Loop',
        documentation: 'For loop in Fantom. Example:\n\n`for (i in 0..<10) { }`',
        insertText: 'for (${1:i} in ${2:0}..<${3:10}) \n{\n\t$0\n}',
        insertTextFormat: 2
    }
];

// Provides Fantom-specific autocomplete suggestions
export function provideCompletionItems(params: CompletionParams, documents: TextDocuments<TextDocument>, connection: Connection): CompletionItem[] {
    const module = "[AUTOCOMPLETE]";
    const doc = documents.get(params.textDocument.uri);

    if (doc) {
        logMessage("debug",`Providing Fantom-specific autocomplete suggestions for document: ${doc.uri.split('/').pop()}`, module, connection);
        // Additional filtering or customization based on `settings` or `params` can be added here.
        
        return completionItems;
    }
    return [];
}
