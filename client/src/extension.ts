import * as path from 'path';
import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient/node';
import { FantomDocsProvider, FantomDocsDetailsProvider } from './providers/fantomDocsProvider';

let client: LanguageClient;

// Create output channel
const outputChannel = vscode.window.createOutputChannel('Fantom Language Client');

// Define constants
const LANGUAGE_SERVER_ID = 'fantomLanguageServer';
const LANGUAGE_SERVER_NAME = 'Fantom Language Server';
const DOCS_TREE_VIEW_ID = 'fantomDocsTree';
const DOCS_DETAILS_VIEW_ID = 'fantomDocsDetails';

// Log helper function
function logDebug(message: string) {
    outputChannel.appendLine(`[DEBUG] ${message}`);
}

// Read configuration
let settings = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);

if (settings) {
    logDebug('Settings retrieved successfully.');
    logDebug(`Settings: ${JSON.stringify(settings.fantom, null, 2)}`);
} else {
    logDebug('Failed to retrieve settings.');
}

// Log the final settings being applied
logDebug('Final settings being applied:');

export async function activate(context: vscode.ExtensionContext) {
    logDebug('Activating Fantom support extension...');

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
        initializationOptions: settings,
    };

    logDebug('Client options set.');

    // Initialize the language client
    client = new LanguageClient(LANGUAGE_SERVER_ID, LANGUAGE_SERVER_NAME, serverOptions, clientOptions);
    logDebug('Language client initialized.');

    // Pass the outputChannel and context to the providers
    const fantomDocsProvider = new FantomDocsProvider(outputChannel, context);
    const detailsProvider = new FantomDocsDetailsProvider(context, outputChannel);

    // Register commands, tree view, and webview
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
            logDebug(`** Details requested for ${item.qname} **`);
            detailsProvider.showSlotDetails(
                item.label || 'Unnamed Item',
                item.type || 'No type',
                item.qname || 'No qname'
            );
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            logDebug('Configuration changed.');
            if (event.affectsConfiguration(LANGUAGE_SERVER_ID)) {
                logDebug('Configuration changed.');
                settings = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
                const updatedDefaultSettings = vscode.workspace.getConfiguration().get(LANGUAGE_SERVER_ID, {});
                client.sendNotification('workspace/didChangeConfiguration', { settings });
            }
        })
    );

    logDebug('Fantom Docs Tree View and Webview provider registered.');

    // Start the client
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
