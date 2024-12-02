import { Connection } from 'vscode-languageserver';
import { generalDebugLevel } from '../config/settingsHandler';

// Log messages based on the debug level
export function logMessage(level: 'info' | 'warn' | 'err' | 'debug', message: string, prefix: string = '', connection?: Connection, opts?: string): void {
    
    let debugLevel = generalDebugLevel();
    
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
    } else {
        console.log("[SETTINGS ERROR] UNKNOWN DEBUG LEVEL: " + debugLevel);
    }
}

// Notify user with a popup message
export async function notifyUser(connection: Connection, message: string, type: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    if (type === 'info') {
        await connection.window.showInformationMessage(message);
    } else if (type === 'warn') {
        await connection.window.showWarningMessage(message);
    } else if (type === 'error') {
        await connection.window.showErrorMessage(message);
    }
}