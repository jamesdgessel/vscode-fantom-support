import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logMessage } from '../utils/notify'; 

export type FantomDocs = {
    name: string;
    classes: { name: string; 
               methods: { name: string; type: string }[];
               fields: { name: string; type: string }[];
            }[];
}[];

export type FantomDocStructure = 
{
    name: string;
    type: string;
    classes: {  name: string; 
                type: string;
                facets: string[];
                methods: {  name: string; type: string;
                            params: {name: string; type: string;}[];
                            }[];
                fields: { name: string; type: string;}[];
            }[];
};

// Removed redundant array notation as the type already represents an array
export type FantomNavStructure = 
{
    name: string;
    type: string;
    classes: {  name: string; 
                type: string;
                methods: { name: string; type: string;}[];
                fields: { name: string; type: string;}[];
            }[];
};

/**
 * Fantom config class to manage the extension configuration.
 */
export class Fantom {

    private static instance: Fantom; 
    private settings: any;

    public fanHome: string = '';
    public fanExecutable: string = '';
    public fanDocsPath: string = '';

    public docPath: string = '';
    public navPath: string = '';

    private fan_buildDocs_path = path.resolve(__dirname, "../server/fan/buildDocs.fan");

    public constructor(settings: any) {
        this.settings = settings;

        if (!this.settings.fantom) {
            throw new Error('Fantom settings are not defined.');
        }
    }

    public async init() {
        this.fanHome = await this.resolveFanHome();
        this.fanDocsPath = this.resolveFanDocsPath();
        this.fanExecutable = await this.resolveFanExecutable();

        this.docPath = path.join(this.fanDocsPath, 'fantom-docs.json');
        this.navPath = path.join(this.fanDocsPath, 'fantom-docs-nav.json');

        await this.validatePaths();
        await this.initFantomDocs();
    }

    public static async getInstance(settings: any): Promise<Fantom> {
        if (!Fantom.instance) {
            Fantom.instance = new Fantom(settings);
            await Fantom.instance.init(); // Ensure initialization
        }
        return Fantom.instance;
    }

    /**
     * Validate essential paths and log warnings if not found.
     */
    private async validatePaths() {
        if (!this.fanHome || !fs.existsSync(this.fanHome)) {
            logMessage('err', `Invalid FAN_HOME: ${this.fanHome}`, '[FAN CONFIG]');
            throw new Error('FAN_HOME is not properly configured.');
        }

        if (!fs.existsSync(this.docPath)) {
            logMessage('warn', `Fantom Docs file missing at ${this.docPath}`, '[FAN CONFIG]');
        }

        if (!fs.existsSync(this.navPath)) {
            logMessage('warn', `Fantom Nav file missing at ${this.navPath}`, '[FAN CONFIG]');
        }
    }

    /**
     * Resolve the Fantom executable path.
     */
    public async resolveFanExecutable(): Promise<string> {
        logMessage('info', `Resolving fan executable`, '[FANTOM]');
        logMessage('info', `Platform: ${process.platform}`, '[FANTOM]');
        const executablePath = process.platform === 'win32'
            ? path.join(this.fanHome, 'bin', 'fan.bat')
            : path.join(this.fanHome, 'bin', 'fan');

        if (!fs.existsSync(executablePath)) {
            const errorMessage = `Fantom executable not found at "${executablePath}". Please ensure Fantom is installed correctly.`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error(errorMessage);
        }

        logMessage('info', `Fantom executable resolved to: ${executablePath}`, '[FANTOM]');
        return executablePath;
    }

    /**
     * Utility method to read and parse a JSON file.
     */
    private async readJsonFile(filePath: string): Promise<object> {
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

    public async docs(): Promise<object> {
        return await this.readJsonFile(this.docPath);
    }

    public async nav(): Promise<object> {
        return await this.readJsonFile(this.navPath);
    }

    private async resolveFanHome(): Promise<string> {
        const homeMode = this.settings.fantom.homeMode;
        logMessage('info', `Fantom home mode: ${homeMode}`, '[FANTOM]');
    
        const isValidPath = (p: string): boolean => fs.existsSync(p);
        const workspacePath = path.resolve(__dirname, '../../../');
    
        // Helper function to recursively search for 'bin/fan' in the workspace
        const searchBinDirectory = (dir: string): string | null => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    if (file === 'bin' && isValidPath(path.join(fullPath, 'fan'))) {
                        return dir;
                    }
                    const result = searchBinDirectory(fullPath);
                    if (result) {
                        return result;
                    }
                }
            }
            return null;
        };
    
        // Functions to attempt each path mode
        const tryCustomPath = () => {
            const customPath = this.settings.fantom.homeCustom;
            if (customPath && isValidPath(customPath)) {
                logMessage('info', `Using custom fan path: ${customPath}`, '[FANTOM]');
                return customPath;
            } else {
                logMessage('warn', `Custom path invalid or not found: ${customPath}`, '[FANTOM]');
                return null;
            }
        };
    
        const tryLocalPath = () => {
            const localFanPath = path.join(workspacePath, 'bin', 'fan');
            logMessage('info', `Checking local fan path: ${localFanPath}`, '[FANTOM]');
            if (isValidPath(localFanPath)) {
                logMessage('info', `Using local fan path: ${localFanPath}`, '[FANTOM]');
                return workspacePath;
            } else {
                logMessage('warn', `Local fan path does not exist: ${localFanPath}`, '[FANTOM]');
                logMessage('info', 'Attempting to find bin/fan recursively in workspace.', '[FANTOM]');
                const recursivePath = searchBinDirectory(workspacePath);
                if (recursivePath) {
                    logMessage('info', `Found bin directory at: ${recursivePath}`, '[FANTOM]');
                    return recursivePath;
                } else {
                    logMessage('warn', `Bin directory not found recursively in workspace: ${workspacePath}`, '[FANTOM]');
                    return null;
                }
            }
        };
    
        const tryGlobalPath = () => {
            const fanHome = process.env.FAN_HOME;
            if (fanHome && isValidPath(fanHome)) {
                logMessage('info', `Using global FAN_HOME: ${fanHome}`, '[FANTOM]');
                return fanHome;
            } else {
                logMessage('warn', 'FAN_HOME environment variable not set or invalid.', '[FANTOM]');
                return null;
            }
        };
    
        let fanHomePath: string | null = null;
    
        if (homeMode === 'custom') {
            fanHomePath = tryCustomPath();
            if (fanHomePath) {
                return fanHomePath;
            }
            logMessage('info', 'Falling back to local path.', '[FANTOM]');
            fanHomePath = tryLocalPath();
            if (fanHomePath) {
                return fanHomePath;
            }
            logMessage('info', 'Falling back to global path.', '[FANTOM]');
            fanHomePath = tryGlobalPath();
            if (fanHomePath) {
                return fanHomePath;
            }
        } else if (homeMode === 'local') {
            fanHomePath = tryLocalPath();
            if (fanHomePath) {
                return fanHomePath;
            }
            logMessage('info', 'Falling back to global path.', '[FANTOM]');
            fanHomePath = tryGlobalPath();
            if (fanHomePath) {
                return fanHomePath;
            }
        } else if (homeMode === 'global') {
            fanHomePath = tryGlobalPath();
            if (fanHomePath) {
                return fanHomePath;
            }
        } else {
            throw new Error(`Invalid homeMode: ${homeMode}. Please set 'homeMode' to 'custom', 'local', or 'global' in settings.`);
        }
    
        throw new Error('Fantom docs path not found. Please check your settings and environment variables.');
    }
    

    private resolveFanDocsPath(): string {
        logMessage('info', `Resolving Fantom docs path with mode: ${this.settings.fantom.docStoreMode}`, '[FANTOM]');
        switch (this.settings.fantom.docStoreMode) {
            case 'fanHome':
                const fanHomePath = path.join(this.fanHome, 'vscode');
                logMessage('info', `Using default docs path: ${fanHomePath}`, '[FANTOM]');
                return fanHomePath;
            case 'custom':
                const customPath = this.settings.fantom.docStoreCustom;
                logMessage('info', `Using custom docs path: ${customPath}`, '[FANTOM]');
                return customPath;
            default:
                const errorMessage = 'Invalid Fantom docs store mode.';
                logMessage('err', errorMessage, '[FANTOM]');
                throw new Error(errorMessage);
        }
    }

    public async runFanFile(fantomScriptPath: string, args: string[]): Promise<string> {
        const absoluteScriptPath = path.resolve(fantomScriptPath);
        logMessage('info', `Executing Fantom script: "${absoluteScriptPath}" with args: ${args.join(' ')}`, '[FANTOM]');
    
        // Check if the Fantom script exists
        if (!fs.existsSync(absoluteScriptPath)) {
            const errorMessage = `Fantom script not found at "${absoluteScriptPath}". Please ensure the script exists.`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error(errorMessage);
        }
    
        return new Promise((resolve, reject) => {
            // Properly quote the executable and script paths
            const executable = `"${this.fanExecutable}"`;
            const scriptPath = `"${absoluteScriptPath}"`;
            const quotedArgs = args.map(arg => `"${arg}"`).join(' ');
    
            // Construct the command string
            const command = `${executable} ${scriptPath} ${quotedArgs}`;
            logMessage('info', `Constructed command: ${command}`, '[FANTOM]');
    
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    const errorMessage = `Error executing Fantom script "${absoluteScriptPath}": ${stderr || error.message}`;
                    logMessage('err', errorMessage, '[FANTOM]');
                    reject(new Error(errorMessage));
                    return;
                }
                if (stderr) {
                    logMessage('warn', `Fantom script stderr: ${stderr}`, '[FANTOM]');
                }
                logMessage('info', `Fantom script output: ${stdout.trim()}`, '[FANTOM]');
                resolve(stdout.trim());
            });
        });
    }
    

    public async initFantomDocs(): Promise<string> {
        logMessage('info', 'Initializing Fantom docs.', '[FANTOM]');
        try {
            logMessage('info', `Running fan ${this.fan_buildDocs_path}`, '[FANTOM]');
            const out = await this.runFanFile(this.fan_buildDocs_path, []);
            logMessage('info', 'Built Fantom docs.', '[FANTOM]');
            logMessage('info', `Fantom docs output: ${out}`, '[FANTOM]');
            return out; // Return the output here
        } catch (error) {
            console.error("Error initializing Fantom docs:", error);
            return Promise.reject("Error initializing Fantom docs. Please check the logs for more details.");
        }
    }

    /**
     * Executes the Fantom docLookup.fan script.
     * @returns A Promise that resolves to the script's output, or rejects with an error.
     */
    public async fanDocLookup(input: string): Promise<string> {
        logMessage('info', `Looking up Fantom docs for input: "${input}"`, '[FANTOM]');
        try {
            const docs = await this.docs();
            logMessage('info', 'Fantom docs successfully retrieved.', '[FANTOM]');
            const result = await this.findInDocs(docs, input);
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

     // public async executeFanCmd (command: string, args: string[]): Promise<string> {

    //     const fantomExecutable = this.fanExecutable;
    //     logMessage('info', `Executing Fantom command: ${scriptName}`, '[FANTOM]');
    
    //     return new Promise((resolve, reject) => {
    //         execFile(fantomExecutable, [fantomScriptPath, ...args], (error, stdout, stderr) => {
    //             if (error) {
    //                 reject(`Error executing Fantom script: ${stderr || error.message}`);
    //                 return;
    //             }
    //             resolve(stdout.trim());
    //         });
    //     });
    // }
}

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});