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
    if (debug) {
        outputChannel.appendLine(message);
    }
}

// Define type for DocsData
interface DocsData {
    name: string;
    classes: {
        name: string;
        slots: {
            name: string;
            documentation: string;
        }[];
    }[];
}

export function activate(context: vscode.ExtensionContext) {
    logDebug('Activating Fantom support extension...');

    // Path to the server module
    const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
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

    // Pass the outputChannel to the providers
    const fantomDocsProvider = new FantomDocsProvider(outputChannel);
    const detailsProvider = new FantomDocsDetailsProvider(context, outputChannel);

    // Collect disposables
    context.subscriptions.push(
        vscode.window.createTreeView(DOCS_TREE_VIEW_ID, {
            treeDataProvider: fantomDocsProvider,
        }),
        vscode.window.registerWebviewViewProvider(DOCS_DETAILS_VIEW_ID, detailsProvider),
        vscode.commands.registerCommand('fantomDocs.showDetails', (item) => {
            logDebug(`Showing details for ${item.type}: ${item.label}`);
            detailsProvider.showSlotDetails(item.label, item.documentation);
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(LANGUAGE_SERVER_ID)) {
                logDebug('Configuration changed.');
                const newConfig = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
                client.sendNotification('workspace/didChangeConfiguration', { settings: newConfig });
            }
        })
    );

    logDebug('Fantom Docs Tree View and WebviewView provider registered.');

    // Start the client. This will also launch the server
    client.start();
    logDebug('Client started.');

    // Handle client readiness
    client.onDidChangeState((event) => {
        if (event.newState === 2) { // 2 corresponds to "Running" state
            logDebug('Client is ready.');

            // Send diagnostics request
            client.sendRequest('workspace/diagnostics', {
                documentSelector: [{ language: 'fantom' }],
            });
            logDebug('Diagnostics request sent.');

            // Fetch documentation data from the server and populate the tree view
            client.sendRequest<DocsData[]>('docs/getDocsData').then((data) => {
                if (data) {
                    logDebug('Received documentation data.');
                    fantomDocsProvider.setPods(data);
                }
            });

            // Listen for updates to documentation data
            client.onNotification('docs/updateDocsData', (updatedData: DocsData[]) => {
                if (updatedData) {
                    logDebug('Received updated documentation data.');
                    fantomDocsProvider.setPods(updatedData);
                }
            });
        }
    });
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    logDebug('Deactivating Fantom support extension...');
    return client.stop();
}
