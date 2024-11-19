// src/extension.ts

import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { FantomDocsProvider } from './fantomDocsProvider'; // Added import

let client: LanguageClient;
const outputChannel = vscode.window.createOutputChannel('Fantom Extension Support');

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
  outputChannel.appendLine('Activating Fantom support extension...');
  
  // Path to the server module
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // Server options to run or debug the language server
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Define client options with semantic tokens legend and document selector
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'fantom' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
    },
    initializationOptions: {
      enableLogging: vscode.workspace.getConfiguration('fantomLanguageServer').get('enableLogging', false),
      highlightVariableDeclarations: vscode.workspace.getConfiguration('fantomLanguageServer').get('highlightVariableDeclarations', true),
      highlightVariableUsage: vscode.workspace.getConfiguration('fantomLanguageServer').get('highlightVariableUsage', true),
    },
  };

  // Initialize the language client
  client = new LanguageClient(
    'fantomLanguageServer',
    'Fantom Language Server',
    serverOptions,
    clientOptions
  );

  outputChannel.appendLine('Language client initialized.');

  // Register the Fantom Docs Tree View
  const fantomDocsProvider = new FantomDocsProvider();
  const fantomDocsTree = vscode.window.createTreeView('fantomDocsTree', { treeDataProvider: fantomDocsProvider });
  context.subscriptions.push(fantomDocsTree);

  // Register for diagnostics and documentation data when client is ready
  client.onDidChangeState((event) => {
    if (event.newState === 2) { // Ready
      outputChannel.appendLine('Client is ready.');

      // Send diagnostics request
      client.sendRequest('workspace/diagnostics', { documentSelector: [{ language: 'fantom' }] });

      // Fetch documentation data from the server and populate the tree view
      client.sendRequest<DocsData[]>('docs/getDocsData').then((data) => {
        if (data) {
          outputChannel.appendLine('Received documentation data.');
          fantomDocsProvider.setPods(data);
        }
      });

      // Listen for updates to documentation data
      client.onNotification('docs/updateDocsData', (updatedData: DocsData[]) => {
        if (updatedData) {
          outputChannel.appendLine('Received updated documentation data.');
          fantomDocsProvider.setPods(updatedData);
        }
      });
    }
  });

  // Start the client. This will also launch the server
  client.start();
  outputChannel.appendLine('Client started.');

  // Listen for changes in configuration
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('fantomLanguageServer')) {
        outputChannel.appendLine('Configuration changed.');
        client.sendNotification('workspace/didChangeConfiguration', {
          settings: vscode.workspace.getConfiguration('fantomLanguageServer')
        });
      }
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  outputChannel.appendLine('Deactivating Fantom support extension...');
  return client.stop();
}
