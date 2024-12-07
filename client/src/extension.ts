// src/extension.ts

import * as path from 'path';
import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient/node';
import { FantomDocsProvider, FantomDocsDetailsProvider } from './providers/fantomDocsProvider';
import { BaseItem } from './providers/fantomTreeItem';

let client: LanguageClient;

// Create output channel
const outputChannel = vscode.window.createOutputChannel('Fantom Language Client');

// Define constants
export const LANGUAGE_SERVER_ID = 'fantomLanguageServer';
const LANGUAGE_SERVER_NAME = 'Fantom Language Server';
const DOCS_TREE_VIEW_ID = 'fantomDocsTree';
const DOCS_DETAILS_VIEW_ID = 'fantomDocsDetails';

// Log helper function
let debug: boolean = false; // Initialize debug flag

function logDebug(message: string) {
    if (debug) {
        outputChannel.appendLine(`[DEBUG] ${message}`);
    }
}

// Read initial configuration
const configuration = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
debug = configuration.get<boolean>('fantomDocs.debug', false);

logDebug('Settings retrieved successfully.');
logDebug(`Settings: ${JSON.stringify(configuration.get('fantomDocs'), null, 2)}`);

// Log the final settings being applied
logDebug('Final settings being applied:');

/**
 * Activates the Fantom support extension.
 * @param context The extension context.
 */
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
        initializationOptions: configuration,
    };

    logDebug('Client options set.');

    // Initialize the language client
    client = new LanguageClient(LANGUAGE_SERVER_ID, LANGUAGE_SERVER_NAME, serverOptions, clientOptions);
    logDebug('Language client initialized.');

    // Start the client
    client.start();
    logDebug('Language client started.');

    // Initialize providers
    const fantomDocsProvider = new FantomDocsProvider(outputChannel, context);
    const detailsProvider = new FantomDocsDetailsProvider(context, outputChannel);

    // Register Tree View
    const treeView = vscode.window.createTreeView(DOCS_TREE_VIEW_ID, {
        treeDataProvider: fantomDocsProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    // Register Webview View Provider
    const webviewViewProvider = vscode.window.registerWebviewViewProvider(DOCS_DETAILS_VIEW_ID, detailsProvider);
    context.subscriptions.push(webviewViewProvider);

    // Register Commands
    const showDetailsCommand = vscode.commands.registerCommand('fantomDocs.showDetails', (item: BaseItem) => {
        if (!item) {
            logDebug('No item selected');
            return;
        }
        logDebug(`** Details requested for ${item.qname} **`);
        detailsProvider.showSlotDetails(
            item.label || 'No label',
            item.type || 'No qname',
            item.qname || 'No qname',
        );
    });
    context.subscriptions.push(showDetailsCommand);

    const addFavCommand = vscode.commands.registerCommand('fantomDocs.addFav', (item: BaseItem) => {
        fantomDocsProvider.addFavPod(item);
    });
    context.subscriptions.push(addFavCommand);

    const removeFavCommand = vscode.commands.registerCommand('fantomDocs.removeFav', (item: BaseItem) => {
        fantomDocsProvider.removeFavPod(item);
    });
    context.subscriptions.push(removeFavCommand);

    const refreshCommand = vscode.commands.registerCommand('fantomDocs.refresh', () => {
        fantomDocsProvider.refresh();
    });
    context.subscriptions.push(refreshCommand);

    const searchCommand = vscode.commands.registerCommand('fantomDocs.search', async () => {
        const searchQuery = await vscode.window.showInputBox({ prompt: 'Search Fantom Docs' });
        if (searchQuery) {
            fantomDocsProvider.search(searchQuery);
        }
    });
    context.subscriptions.push(searchCommand);

    // Listen for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(`${LANGUAGE_SERVER_ID}.fantomDocs`)) {
            logDebug('FantomDocs configuration changed.');
            // Update debug flag
            debug = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID).get<boolean>('fantomDocs.debug', false);
            logDebug(`Debug flag updated to: ${debug}`);

            // Refresh the provider
            fantomDocsProvider.refresh();
        }
    });
    context.subscriptions.push(configChangeListener);

    logDebug('Fantom Docs Tree View and Webview provider registered.');
}

/**
 * Deactivates the Fantom support extension.
 */
export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    logDebug('Deactivating Fantom support extension...');
    return client.stop();
}
