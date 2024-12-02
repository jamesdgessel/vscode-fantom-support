import { logMessage } from '../utils/notify';


let settings: { [key: string]: any } = {"general":{"debug":"messages"}};

// Initialize settings (can be called on server startup)
export async function initializeSettings(initSettings: any): Promise<{ [key: string]: any }> {
    logMessage('info', 'Initializing settings', '[SETTINGS]')
    logMessage('debug', "Settings: " + JSON.stringify(initSettings), '[SETTINGS]');
    settings = {
        ...initSettings,
    };
    return settings;
}

// Get current settings
export function getSettings() {
    return settings;
}

// Update settings based on configuration change
export async function updateSettings(newSettings: any): Promise<{ [key: string]: any }> {
    
    settings = {
        ...settings, // Retain existing settings
        ...newSettings, // Apply new settings
    };
    
    logMessage('info', "Settings updated: " + JSON.stringify(settings, null, 2), '[SETTINGS]');
    
    return settings;
}

// Check if a feature is enabled in the settings
export function isFeatureEnabled(feature: string): boolean {
    const enabled = getSettingValue(feature + ".enable") === true;
    logMessage('info', `${enabled ? '✓' : 'x'} ${feature} module`, '[SETTINGS]');
    return enabled;
}

export function getSettingValue(key: string): any {
    const keys = key.split('.');
    let value = settings;
    for (const k of keys) {
        if (value[k] === undefined) {
            return undefined;
        }
        value = value[k];
    }
    return value;
}

export function generalDebugLevel(): any {
    return getSettingValue('general.debug');
}



