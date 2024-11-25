import * as path from 'path';
import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient/node';
import { FantomDocsProvider, FantomDocsDetailsProvider } from './fantomDocsProvider';

let client: LanguageClient;

// Create output channel
const outputChannel = vscode.window.createOutputChannel('Fantom Language Client');

// Define constants
const LANGUAGE_SERVER_ID = 'fantomLanguageServer';
const LANGUAGE_SERVER_NAME = 'Fantom Language Server';
const DOCS_TREE_VIEW_ID = 'fantomDocsTree';
const DOCS_DETAILS_VIEW_ID = 'fantomDocsDetails';

// Read configuration
let fantomConfig = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
let debug = fantomConfig.get<boolean>('enableLogging', false);

// Update debug flag when configuration changes
vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(LANGUAGE_SERVER_ID)) {
        fantomConfig = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
        debug = fantomConfig.get<boolean>('enableLogging', false);
        // ...existing code...
    }
});

// Helper function for debug logging
function logDebug(message: string) {
    if (false) {
        outputChannel.appendLine(message);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Fantom support extension...');

    // Path to the server module
    const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // Server options to run or debug the language server
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions,
        },
    };

    logDebug('Server options set.');

    // Define client options
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'fantom' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc'),
        },
        initializationOptions: {
            enableLogging: debug,
            highlightVariableDeclarations: fantomConfig.get<boolean>('highlightVariableDeclarations', true),
            highlightVariableUsage: fantomConfig.get<boolean>('highlightVariableUsage', true),
        },
    };

    logDebug('Client options set.');

    // Initialize the language client
    client = new LanguageClient(LANGUAGE_SERVER_ID, LANGUAGE_SERVER_NAME, serverOptions, clientOptions);

    logDebug('Language client initialized.');

    // Pass the outputChannel and context to the providers
    const fantomDocsProvider = new FantomDocsProvider(outputChannel, context);
    const detailsProvider = new FantomDocsDetailsProvider(context, outputChannel);

    // Collect disposables
    context.subscriptions.push(
        vscode.window.createTreeView(DOCS_TREE_VIEW_ID, {
            treeDataProvider: fantomDocsProvider,
        }),
        vscode.window.registerWebviewViewProvider(DOCS_DETAILS_VIEW_ID, detailsProvider),
        vscode.commands.registerCommand('fantomDocs.showDetails', (item) => {
            if (!item) {
                logDebug('No item selected');
                return;
            }
            
            logDebug(` ** details requested for ${item.qname} **`);
            detailsProvider.showSlotDetails(
                item.label || 'Unnamed Item', 
                item.type || 'No type',
                item.qname || 'No qname',
            );
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(LANGUAGE_SERVER_ID)) {
                logDebug('Configuration changed.');
                fantomConfig = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
                debug = fantomConfig.get<boolean>('enableLogging', false);
                client.sendNotification('workspace/didChangeConfiguration', { settings: fantomConfig });
            }
        })
    );

    logDebug('Fantom Docs Tree View and WebviewView provider registered.');

    // Start the client. This will also launch the server
    client.start();
    logDebug('Client started.');
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    logDebug('Deactivating Fantom support extension...');
    return client.stop();
}
