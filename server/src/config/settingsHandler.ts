import { Connection, DidChangeConfigurationParams } from 'vscode-languageserver';
import { logMessage } from '../utils/notify';
// import { workspace } from 'vscode';

// Default settings for the language server
export let settings: ServerSettings = {
    general: {
        enable: true,
        debug: 'messages', // off, messages, verbose
    },
    fantom: {
        enable: true,
        debug: 'off', // off, messages, verbose
        homeMode: 'global',
        homeCustom: '',
        docStoreMode: 'fanHome',
        docStoreCustom: '',
    },
    syntaxHighlighting: {
        enable: true,
        debug: 'off', // off, messages, verbose
        highlightVariableDeclarations: true,
        highlightVariableUsage: true,
    },
    codeOutline: {
        enable: true,
        debug: 'off', // off, messages, verbose
    },
    formatting: {
        enable: true,
        debug: 'off', // off, messages, verbose
    },
    linting: {
        enable: true,
        debug: 'off', // off, messages, verbose
    },
    autocompletion: {
        enable: true,
        debug: 'off', // off, messages, verbose
    },
    hoverDocs: {
        enable: true,
        debug: 'off', // off, messages, verbose
    },
};

// ServerSettings type for type safety
export type ServerSettings = {
    general: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
    fantom: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
        homeMode: 'global' | 'local' | 'custom';
        homeCustom: string;
        docStoreMode: 'fanHome' | 'workspaceRoot' | 'custom';
        docStoreCustom: string;
    };
    syntaxHighlighting: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
        highlightVariableDeclarations: boolean;
        highlightVariableUsage: boolean;
    };
    codeOutline: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
    formatting: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
    linting: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
    autocompletion: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
    hoverDocs: {
        enable: boolean;
        debug: 'off' | 'messages' | 'verbose';
    };
};

// // Initialize settings (can be called on server startup)
// export async function initializeSettings(connection: Connection): Promise<ServerSettings> {
//     logMessage('info', 'Initializing settings', '[SETTINGS]', connection)
//     settings = {
//         ...settings,
//     };
//     return settings;
// }

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


