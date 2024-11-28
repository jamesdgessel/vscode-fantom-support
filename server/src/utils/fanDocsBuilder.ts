import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logMessage } from '../utils/notify'; 
import { FanEnv } from '../utils/fanEnv';
import { FantomDocStructure, FantomNavStructure } from '../utils/fanUtils';

/**
 * Fantom config class to manage the extension configuration.
 */
export class FantomDocs extends FanEnv {

    private static instance: FantomDocs; 
    private settings: any;

    public fanDocsPath: string;
    public docPath?: string = undefined;
    public navPath?: string = undefined;

    public docs?: FantomDocStructure[] = undefined;
    public nav?: FantomNavStructure[] = undefined;

    private docBuilderExec: string;

    protected constructor(settings: any, fanHome: string, fanExecutable: string) {

        logMessage('info', 'Initializing FantomDocs', '[FANTOM]');

        super(fanHome, fanExecutable)

        this.settings = settings;
        this.fanDocsPath = path.resolve(__dirname, settings.fantom?.fantomDocsPath || '../docs');
        logMessage('info', `Docs path set to ${this.fanDocsPath}`, '[FANTOM]');
        logMessage('info', `To reload/build docs from installed pods, use xxx command`, '[HELP]');

        let docPath = path.join(this.fanDocsPath, 'fantom-docs.json');
        let navPath = path.join(this.fanDocsPath, 'fantom-docs-nav.json');

        this.docBuilderExec = path.resolve(__dirname, "../server/fan/buildDocs.fan")
        logMessage('debug', `Doc builder executable set to ${this.docBuilderExec}`, '[FANTOM]');

        // Verify if the docPath and navPath files exist and log their status
        if (fs.existsSync(docPath)) {
            logMessage('info', `Docs found at ${docPath}`, '[FANTOM]');
            this.docPath = docPath;
        } else {
            logMessage('warn', `Doc file missing at ${docPath}`, '[FANTOM]');
        }

        if (fs.existsSync(navPath)) {
            logMessage('info', `Nav found at ${navPath}`, '[FANTOM]');
            this.navPath = navPath;
        } else {
            logMessage('warn', `Nav file missing at ${navPath}`, '[FANTOM]');
        }
    }

    static async create(settings: any): Promise<FantomDocs> {
        
        const fanHome = await FanEnv.resolveFanHome(settings.fantom.fanHomeMode);
        const fanExecutable = await FanEnv.resolveFanExecutable(fanHome);
        
        const docs = new FantomDocs(settings, fanHome, fanExecutable);
        await docs.init();
        return docs;
    }

    public async init() {
        await this.loadDocs();
        await this.loadNav();
    }

    public static async getInstance(settings: any): Promise<FantomDocs> {
        if (!FantomDocs.instance) {
            FantomDocs.instance = await FantomDocs.create(settings);
            await FantomDocs.instance.init();
        }
        return FantomDocs.instance;
    }

    /**
     * Utility method to read and parse a JSON file.
     */
    private async readJsonFile(filePath?: string): Promise<object> {
        if (!filePath) { 
            logMessage('warn', `JSON unavailable.`, '[FANTOM]');
            return {}; 
        }

        logMessage('info', `Reading JSON file: ${filePath}`, '[FANTOM]');
        if (!fs.existsSync(filePath)) {
            const errorMessage = `File not found: ${filePath}`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error(errorMessage);
        }
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(data);
            logMessage('info', `Successfully read and parsed JSON file: ${filePath}`, '[FANTOM]');
            return jsonData;
        } catch (error) {
            const errorMessage = `Error reading or parsing JSON file: ${filePath}. Error: ${(error as Error).message}`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error(errorMessage);
        }
    }

    public async loadDocs(): Promise<void> {
        if (!this.docPath) {
            logMessage('warn', `Docs file missing, cannot load`, '[FANTOM]');
            await this.buildFantomDocs();
            return;
        }
        const docs = await this.readJsonFile(this.docPath) as FantomDocStructure[];
        if (Array.isArray(docs)) {
            this.docs = docs;
            logMessage('info', `Docs successfully loaded.`, '[FANTOM]');
        } else {
            logMessage('err', `Invalid docs structure.`, '[FANTOM]');
        }
    }

    public async loadNav(): Promise<void> {
        if (!this.navPath) {
            logMessage('warn', `Nav file missing, cannot load`, '[FANTOM]');
            return;
        }
        const nav = await this.readJsonFile(this.navPath) as FantomNavStructure[];
        if (Array.isArray(nav)) {
            this.nav = nav;
            logMessage('info', `Nav successfully loaded.`, '[FANTOM]');
        } else {
            logMessage('err', `Invalid nav structure.`, '[FANTOM]');
        }
    }

    public async buildFantomDocs(): Promise<string> {

        if (this.fanExecutable && this.fanHome && this.docBuilderExec) {
            logMessage('info', `Attempting to build fan docs via FanEnv`, '[FANTOM]');

            try {
                logMessage('info', `Running cmd "fan ${this.docBuilderExec}"`, '[FANTOM]');
                const out = await this.runFanFile(this.docBuilderExec, [this.fanDocsPath]);
                logMessage('info', `fan returned: ${out}`, '[FANTOM]');
                this.docPath = path.join(this.fanDocsPath, 'fantom-docs.json');
                this.navPath = path.join(this.fanDocsPath, 'fantom-docs-nav.json');

                await this.loadDocs()
                // await this.loadNav()
                
                logMessage('info', `Success! Output docs to: ${this.fanDocsPath}`, '[FANTOM]');
                return out; // Return the output here
            } catch (error) {
                return Promise.reject("Error building Fantom docs. "+error);
            }
        } else {
            const errorMessage = "FanEnv insufficient, see logs";
            logMessage('err', 'FanEnv insufficient, see logs', '[FANTOM]');
            return Promise.reject(errorMessage);
        }
    }

    /**
     * Executes the Fantom docLookup.fan script.
     * @returns A Promise that resolves to the script's output, or rejects with an error.
     */
    public async fanDocLookup(input: string): Promise<string> {
        logMessage('info', `Looking up Fantom docs for input: "${input}"`, '[FANTOM]');
        if (!this.docs) {
            logMessage('warn', `Docs unavailable.`, '[FANTOM]');
            return 'Fantom docs unavailable. Please check the logs for more details.';
        }

        try {
            logMessage('info', 'Fantom docs successfully retrieved.', '[FANTOM]');
            const result = await this.findInDocs(this.docs, input);
            if (result) {
                logMessage('info', `Match found for "${input}"`, '[FANTOM]');
                return result;
            } else {
                logMessage('info', `No match found for "${input}"`, '[FANTOM]');
                return `No match found for "${input}"`;
            }
        } catch (error) {
            const errorMessage = `Error fetching Fantom docs: ${error instanceof Error ? error.message : 'Unknown error'}`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error('Error fetching Fantom docs. Please check the logs for more details.');
        }
    }

    public async findInDocs(obj: any, name: string): Promise<string | null> {
        // logMessage('info', `Searching for "${name}" in docs.`, '[FANTOM]');
        try {
            // logMessage('info', `Checking object: ${obj.name}`, '[FANTOM]');
            if (obj && obj.name === name) {
                let result = `${obj.qname}\n\n`;
                if (obj.signature) {
                    result += `
\`\`\`fantom
${obj.signature}
\`\`\`
`;
                }
                logMessage('info', `Found match for "${name}": ${result}`, '[FANTOM]');
                return result;
            }

            if (Array.isArray(obj)) {
                for (const item of obj) {
                    const found = await this.findInDocs(item, name);
                    if (found) {
                        return found;
                    }
                }
            } else if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        const found = await this.findInDocs(obj[key], name);
                        if (found) {
                            return found;
                        }
                    }
                }
            }
        } catch (error) {
            const errorMessage = `Error in findInDocs: ${error instanceof Error ? error.message : 'Unknown error'}`;
            logMessage('err', errorMessage, '[FANTOM]');
            console.error(errorMessage);
        }

        // logMessage('warn', `No match found for "${name}"`, '[FANTOM]');
        return null;
    }

}

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});
