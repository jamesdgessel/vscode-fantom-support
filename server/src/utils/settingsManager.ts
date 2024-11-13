import { Connection, DidChangeConfigurationParams } from 'vscode-languageserver';

// Default settings for the language server
let settings: ServerSettings = {
    debug: true,
    highlightVariableDeclarations: true,
    highlightVariableUsage: true,
    enableClassHighlighting: true,
    enableMethodHighlighting: true,
    enableFieldHighlighting: true,
    checkVariableNaming: true,
    requireSemicolons: true,
    trimWhitespace: true,
    indentAfterBrace: true,
    newLineBeforeClosingBrace: true,
    insertSemicolons: false,
    enableClassOutline: true,
    enableMethodOutline: true,
    enableFieldOutline: true,
};

// ServerSettings type for type safety
type ServerSettings = {
    debug: boolean;
    highlightVariableDeclarations: boolean;
    highlightVariableUsage: boolean;
    enableClassHighlighting: boolean;
    enableMethodHighlighting: boolean;
    enableFieldHighlighting: boolean;
    checkVariableNaming: boolean;
    requireSemicolons: boolean;
    trimWhitespace: boolean;
    indentAfterBrace: boolean;
    newLineBeforeClosingBrace: boolean;
    insertSemicolons: boolean;
    enableClassOutline: boolean;
    enableMethodOutline: boolean;
    enableFieldOutline: boolean;
};

// Initialize settings (can be called on server startup)
export function initializeSettings(connection: Connection): ServerSettings {
    connection.console.log("Initializing default settings...");
    return settings;
}

// Get current settings
export function getSettings(): ServerSettings {
    return settings;
}

// Update settings based on configuration change
export function updateSettings(change: DidChangeConfigurationParams, connection: Connection): ServerSettings {
    const newSettings = change.settings.languageServerExample || {};
    
    settings = {
        ...settings, // Retain existing settings
        ...newSettings, // Apply new settings
    };
    
    if (settings.debug) {
        connection.console.log("Settings updated: " + JSON.stringify(settings));
    }
    
    return settings;
}
