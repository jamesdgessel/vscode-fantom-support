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
    documentSelector: [{ scheme: 'file', language: 'fantom' }], // Ensure 'fantom' matches your language ID
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
    },
  };

  // Initialize the language client
  client = new LanguageClient(
    'fantomLanguageServer',
    'Fantom Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
