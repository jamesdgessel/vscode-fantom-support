// server/features/docsDataProvider.ts

import { Connection } from 'vscode-languageserver';
import { getSettings } from '../utils/settingsManager';
import { buildFantomDocs } from '../utils/fanUtils';   

type FantomDocs = {
    name: string;
    classes: { name: string; slots: { name: string; documentation: string }[] }[];
}[];

export class DocsDataProvider {
    private connection: Connection;
    private docsCache: FantomDocs | null = null;

    constructor(connection: Connection) {
        this.connection = connection;
        this.initialize();
    }

    private async initialize() {
        const settings = getSettings();
        if (settings.debug) {
            console.log('Initializing Fantom documentation cache...');
        }
        
        try {
            this.docsCache = await buildFantomDocs(); // You'll implement this function
        } catch (error) {
            console.error('Failed to initialize Fantom docs:', error);
            this.docsCache = [];
        }
    }

    public getDocsData(): FantomDocs {
        if (!this.docsCache) {
            return []; // Return empty array if cache isn't ready
        }
        return this.docsCache;
    }

    /**
     * Register handlers for requests from the client.
     */
    public registerHandlers() {
        const settings = getSettings(); // Retrieve formatting settings
        if (settings.debug) {
            console.log('Registering handlers for docs data requests...');
        }
        this.connection.onRequest('docs/getDocsData', () => {
            return this.getDocsData();
        });
    }
}
