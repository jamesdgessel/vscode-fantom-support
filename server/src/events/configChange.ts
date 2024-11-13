import { DidChangeConfigurationParams, Connection } from 'vscode-languageserver';

export function handleConfigChange(change: DidChangeConfigurationParams, connection: Connection): void {
    connection.console.log("Configuration changed.");
    // Any additional configuration management can be added here if needed.
}
