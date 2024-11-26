import { Connection, DidChangeConfigurationParams } from 'vscode-languageserver';
// import { workspace } from 'vscode';

// Default settings for the language server
export let settings: ServerSettings = {
    general: {
        enable: true,
        debug: 'messages', // off, messages, verbose
    },
    fantom: {
        homeMode: 'global',
        homeCustom: '',
    },
    syntaxHighlighting: {
        enable: true,
        debug: 'off', // off, messages, verbose
        highlightVariableDeclarations: true,
        highlightVariableUsage: true,
        enableClassHighlighting: true,
        enableMethodHighlighting: true,
        enableFieldHighlighting: true,
    },
    codeOutline: {
        enable: true,
        debug: 'off', // off, messages, verbose
        enableClassOutline: true,
        enableMethodOutline: true,
        enableFieldOutline: true,
    },
    formatting: {
        enable: true,
        debug: 'off', // off, messages, verbose
        requireSemicolons: true,
        trimWhitespace: true,
        indentAfterBrace: true,
        newLineBeforeClosingBrace: true,
        insertSemicolons: false,
    },
    linting: {
        enable: true,
        debug: 'off', // off, messages, verbose
        checkVariableNaming: true,
    },
    autocompletion: {
        enable: true,
        debug: 'off', // off, messages, verbose
    },
    hoverDocs: {
        enable: true,
        debug: 'off', // off, messages, verbose
    },
    fantomDocs: {
        enable: true,
        debug: 'off', // off, messages, verbose
        docStoreMode: 'fanHome',
        docStoreCustom: '',
    },
};

// ServerSettings type for type safety
type ServerSettings = {
    general: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
    fantom: {
        homeMode: 'global' | 'local' | 'custom';
        homeCustom: string;
    };
    syntaxHighlighting: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
        highlightVariableDeclarations: boolean;
        highlightVariableUsage: boolean;
        enableClassHighlighting: boolean;
        enableMethodHighlighting: boolean;
        enableFieldHighlighting: boolean;
    };
    codeOutline: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
        enableClassOutline: boolean;
        enableMethodOutline: boolean;
        enableFieldOutline: boolean;
    };
    formatting: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
        requireSemicolons: boolean;
        trimWhitespace: boolean;
        indentAfterBrace: boolean;
        newLineBeforeClosingBrace: boolean;
        insertSemicolons: boolean;
    };
    linting: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
        checkVariableNaming: boolean;
    };
    autocompletion: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
    hoverDocs: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
    fantomDocs: {
        enable: boolean;
        docStoreMode: 'fanHome' | 'workspaceRoot' | 'custom';
        docStoreCustom: string;
        debug: 'off' | 'messages' | 'verbose';
    };
};

// Initialize settings (can be called on server startup)
export async function initializeSettings(connection: Connection): Promise<ServerSettings> {
    connection.console.log("Initializing default settings...");
    // const config = await workspace.getConfiguration('fantom-support-server');
    settings = {
        ...settings,
        // ...config
    };
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
    
    if (settings.general.debug !== 'off') {
        connection.console.log("Settings updated: " + JSON.stringify(settings));
    }
    
    return settings;
}

// Check if a feature is enabled in the settings
export function isFeatureEnabled(feature: keyof ServerSettings): boolean {
    const featureSettings = settings[feature];
    return typeof featureSettings === 'object' && 'enable' in featureSettings ? featureSettings.enable : false;
}


