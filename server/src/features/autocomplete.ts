import { CompletionItem, CompletionItemKind, CompletionParams, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver/node';
import { getSettings } from '../utils/settingsManager';

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
        insertText: 'Void ${1:methodName}() {\n\t$0\n}',
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
        label: 'Sys.out.print',
        kind: CompletionItemKind.Function,
        detail: 'Prints output to console',
        documentation: 'Prints a string to the console. Example:\n\n`Sys.out.print("Hello, World!")`',
        insertText: 'Sys.out.print(${1:"message"});',
        insertTextFormat: 2
    },
    {
        label: 'if',
        kind: CompletionItemKind.Keyword,
        detail: 'If Statement',
        documentation: 'Conditional if statement in Fantom. Example:\n\n`if (condition) { }`',
        insertText: 'if (${1:condition}) {\n\t$0\n}',
        insertTextFormat: 2
    },
    {
        label: 'for',
        kind: CompletionItemKind.Keyword,
        detail: 'For Loop',
        documentation: 'For loop in Fantom. Example:\n\n`for (i in 0..<10) { }`',
        insertText: 'for (${1:i} in ${2:0}..<${3:10}) {\n\t$0\n}',
        insertTextFormat: 2
    },
    {
        label: 'it',
        kind: CompletionItemKind.Keyword,
        detail: 'Implicit variable for loop iterations',
        documentation: 'The implicit `it` variable can be used for iterable elements in a loop. Example:\n\n`list.each |it| { Sys.out.print(it) }`',
        insertText: 'it'
    }
];

// Provides Fantom-specific autocomplete suggestions
export function provideCompletionItems(params: CompletionParams, documents: TextDocuments<TextDocument>, connection: Connection): CompletionItem[] {
    const settings = getSettings(); // Retrieve settings to control autocomplete behavior if needed
    const doc = documents.get(params.textDocument.uri);

    if (doc) {
        connection.console.log(`Providing Fantom-specific autocomplete suggestions for document: ${doc.uri.split('/').pop()}`);
        // Additional filtering or customization based on `settings` or `params` can be added here.
        return completionItems;
    }
    return [];
}
