import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
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

  // Register for diagnostics
  client.onDidChangeState((event) => {
    if (event.newState === 2) { // Ready
      client.sendRequest('workspace/diagnostics', { documentSelector: [{ language: 'fantom' }] });
    }
  });

  // Start the client. This will also launch the server
  client.start();

  // Listen for changes in configuration
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('fantomLanguageServer')) {
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
  return client.stop();
}
