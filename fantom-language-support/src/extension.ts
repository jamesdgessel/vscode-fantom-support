import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath('dist/server/server.js');
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };
  
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'fantom' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.fan')
    }
  };
  
  client = new LanguageClient('fantomLanguageServer', 'Fantom Language Server', serverOptions, clientOptions);
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}
