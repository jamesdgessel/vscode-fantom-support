// server/features/docsDataProvider.ts

import { Connection } from 'vscode-languageserver';
import { getSettings } from '../utils/settingsManager';

/**
 * Provides documentation data including pods, classes, and slots.
 * This serves as the backend logic for the docs sidebar tree view.
 */
export class DocsDataProvider {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Fetch the list of pods, classes, and slots with their documentation.
     * Replace this implementation with actual data-fetching logic.
     * @returns A structured list of documentation items.
     */
    public getDocsData(): {
        name: string;
        classes: { name: string; slots: { name: string; documentation: string }[] }[];
    }[] {
        const debug = true; // Assuming debug is a constant or a variable defined somewhere
        const settings = getSettings(); // Retrieve formatting settings
        if (debug && settings.debug) {
            console.log('Fetching documentation data...');
        }
        // Mock data example
        return [
            {
                name: 'Pod1',
                classes: [
                    {
                        name: 'Class1',
                        slots: [
                            { name: 'method1', documentation: 'Documentation for method1' },
                            { name: 'field1', documentation: 'Documentation for field1' },
                        ]
                    },
                    {
                        name: 'Class2',
                        slots: [
                            { name: 'method2', documentation: 'Documentation for method2' },
                        ]
                    }
                ]
            },
            {
                name: 'Pod2',
                classes: [
                    {
                        name: 'Class3',
                        slots: [
                            { name: 'method3', documentation: 'Documentation for method3' },
                        ]
                    }
                ]
            }
        ];
    }

    /**
     * Register handlers for requests from the client.
     */
    public registerHandlers() {
        const debug = true; // Assuming debug is a constant or a variable defined somewhere
        const settings = getSettings(); // Retrieve formatting settings
        if (debug && settings.debug) {
            console.log('Registering handlers for docs data requests...');
        }
        this.connection.onRequest('docs/getDocsData', () => {
            return this.getDocsData();
        });
    }
}
