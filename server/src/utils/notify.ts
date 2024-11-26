import { Connection } from 'vscode-languageserver';
import { settings } from './settingsHandler';


// Log messages based on the debug level
export function logMessage(level: 'info' | 'warn' | 'err' | 'debug', message: string, prefix: string = '', connection?: Connection, opts?: string): void {
    const debugLevel = settings.general.debug;
    if (debugLevel === 'off') return;

    const padedPrefix = prefix.padEnd(20);
    const paddedLevel = level.padEnd(5);
    let messagePrefix = ""
    switch (opts) {
        case "start":
            messagePrefix = ">> start ";
            break;
        case "end":
            messagePrefix = "<< end ";
            break;
        case "loop":
            messagePrefix = "    ○ ";
            break;
        default:
            messagePrefix = " ";
    }
    if (messagePrefix === " " && level === 'debug') messagePrefix = "  - ";

    const fullMessage = `[${paddedLevel}] ${padedPrefix} ${messagePrefix}${message}`;
    if (debugLevel === 'messages' && level !== 'debug') {
        console.log(fullMessage);
        if (connection) {
            connection.console.log(fullMessage);
        }
    } else if (debugLevel === 'verbose') {
        console.log(fullMessage);
        if (connection) {
            connection.console.log(fullMessage);
        }
    }
}

// Notify user with a popup message
export function notifyUser(connection: Connection, message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    if (type === 'info') {
        connection.window.showInformationMessage(message);
    } else if (type === 'warn') {
        connection.window.showWarningMessage(message);
    } else if (type === 'error') {
        connection.window.showErrorMessage(message);
    }
}