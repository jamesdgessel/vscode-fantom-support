import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { getSettings } from './settingsHandler';
import { logMessage } from './notify'; // Ensure you have a notify module
import { connection } from '../server'; // Ensure you have a server connection

// Execute a Fantom command
export async function executeFanCmd(scriptName: string, args: string[]): Promise<string> {
    const fantomExecutable = await getFanExecutable();
    const fantomScriptPath = path.resolve(__dirname, "src/fantom", scriptName);

    return new Promise((resolve, reject) => {
        execFile(fantomExecutable, [fantomScriptPath, ...args], (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing Fantom script: ${stderr || error.message}`);
                return;
            }
            resolve(stdout.trim());
        });
    });
}


/**
 * Executes a Fantom file with specified arguments.
 * @param scriptName The name of the Fantom script file (e.g., "TypeSearcher.fan").
 * @param args Arguments to pass to the Fantom script.
 * @returns A Promise that resolves to the script's output, or rejects with an error.
 */
export async function runFanFile(scriptName: string, args: string[]): Promise<string> {
    const fantomExecutable = await getFanExecutable();
    const fantomScriptPath = path.resolve(__dirname, "src/fantom", scriptName);

    return new Promise((resolve, reject) => {
        execFile(fantomExecutable, [fantomScriptPath, ...args], (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing Fantom script: ${stderr || error.message}`);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

/**
 * Executes the Fantom docLookup.fan script.
 * @returns A Promise that resolves to the script's output, or rejects with an error.
 */
export async function fanDocLookup(input: string): Promise<string> {
    try {
        // console.log("getting fantom docs for", input);
        const docs = await getFantomDocs();
        const result = findInDocs(docs, input);
        if (result) {
            return result;
        } else {
            return `No match found for "${input}"`;
        }
    } catch (error) {
        console.error('Error fetching Fantom docs:', error);
        throw new Error('Error fetching Fantom docs. Please check the logs for more details.');
    }
}

function findInDocs(obj: any, name: string): string | null {
    try {
        if (obj && obj.name === name) { 
                // console.log(`Found "${name}"`);
                
                // Construct the result string as Markdown
                let result = `${obj.qname}\n\n`;
            
                if (obj.signature) {
                        result += `
\`\`\`fantom
${obj.signature}
\`\`\`
`;
                }
        
            return result;
        }
        
        if (Array.isArray(obj)) {
            for (const item of obj) {
                const found = findInDocs(item, name);
                if (found) {
                    return found;
                }
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const found = findInDocs(obj[key], name);
                    if (found) {
                        return found;
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error in findInDocs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return null;
}

/**
 * General function to execute a Fantom script with specified arguments.
 * @param scriptPath The path to the Fantom script file.
 * @param args Arguments to pass to the Fantom script.
 * @returns A Promise that resolves to the script's output, or rejects with an error.
 */
export async function executeFanScript(scriptPath: string, args: string[]): Promise<string> {
    const fantomExecutable = await getFanExecutable();

    // Check if the Fantom script exists
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`Fantom script not found at "${scriptPath}". Please ensure the script exists.`);
    }

    return new Promise((resolve, reject) => {
        // On Windows, execute fan.bat via cmd.exe
        if (process.platform === 'win32') {
            execFile('cmd.exe', ['/c', fantomExecutable, scriptPath, ...args], (error, stdout, stderr) => {
                if (error) {
                    const errorMessage = `Error executing Fantom script "${scriptPath}": ${stderr || error.message}`;
                    reject(errorMessage);
                    return;
                }
                if (stderr) {
                    // Non-fatal stderr output
                    console.debug(`Fantom script stderr: ${stderr}`);
                }
                resolve(stdout.trim());
            });
        } else {
            // Unix-like systems
            execFile(fantomExecutable, [scriptPath, ...args], (error, stdout, stderr) => {
                if (error) {
                    const errorMessage = `Error executing Fantom script "${scriptPath}": ${stderr || error.message}`;
                    reject(errorMessage);
                    return;
                }
                if (stderr) {
                    // Non-fatal stderr output
                    console.debug(`Fantom script stderr: ${stderr}`);
                }
                resolve(stdout.trim());
            });
        }
    });
}

export type FantomDocs = {
    name: string;
    classes: { name: string; 
               methods: { name: string; type: string }[];
               fields: { name: string; type: string }[];
            }[];
}[];

export async function initFantomDocs(): Promise<string> {
    console.log("INITIALIZING FANTOM DOCS");
    try {
        const out = await executeFanScript(path.resolve(__dirname, "../server/fan/buildDocs.fan"), []);
        console.log("BUILT FANTOM DOCS");
        console.log(out);
        return out; // Return the output here
    } catch (error) {
        console.error("Error initializing Fantom docs:", error);
        return "Error initializing Fantom docs. Please check the logs for more details.";
    }
}

// Find `bin` folder with `.fan` files in workspace
async function findWorkspaceBinPath(): Promise<string | null> {
    const workspaceFolders = await connection.workspace.getWorkspaceFolders();

    if (!workspaceFolders) {
        logMessage('warn', 'No workspace folders available.', '[SEARCH]', connection);
        return null;
    }

    for (const folder of workspaceFolders) {
        const folderPath = new URL(folder.uri).pathname; // Convert URI to file path
        const binFolderPath = path.join(folderPath, 'bin');

        if (fs.existsSync(binFolderPath) && fs.statSync(binFolderPath).isDirectory()) {
            const files = fs.readdirSync(binFolderPath);
            const fanFiles = files.filter(file => file.endsWith('.fan'));

            if (fanFiles.length > 0) {
                logMessage(
                    'info',
                    `Found bin folder with .fan files: ${binFolderPath}`,
                    '[SEARCH]',
                    connection
                );
                return binFolderPath;
            }
        }
    }

    logMessage('warn', 'No bin folders with .fan files found.', '[SEARCH]', connection);
    return null;
}

async function getFanHome(): Promise<string> {
    const settings = getSettings();

    // Check custom path
    if (settings.fantom.homeMode === 'custom') {
        const customPath = settings.fantom.homeCustom;
        if (customPath && fs.existsSync(customPath)) {
            logMessage('info', 'Using custom Fantom docs path.', '[FANTOM]', connection);
            return customPath;
        }
        logMessage('info', 'Custom path not found. Falling back to local.', '[FANTOM]', connection);
    }

    // Check local path
    if (settings.fantom.homeMode === 'local' || settings.fantom.homeMode === 'custom') {
        const workspacePath = await findWorkspaceBinPath();
        if (workspacePath) {
            logMessage('info', 'Using local Fantom docs path.', '[FANTOM]', connection);
            return workspacePath;
        }
        logMessage('info', 'Local path not found. Falling back to global.', '[FANTOM]', connection);
    }

    // Check global path
    const fanHome = process.env.FAN_HOME;
    if (fanHome && fs.existsSync(fanHome)) {
        logMessage('info', 'Using global Fantom docs path.', '[FANTOM]', connection);
        return fanHome;
    }

    throw new Error('Fantom docs path not found. Please set "docStore" to "custom", "global", or "local" in settings.');
}


/**
 * Search workspace folders for a `bin` folder containing `.fan` files.
 */
async function findBinWithFanFiles(workspaceFolders: string[]): Promise<string[]> {
    const results: string[] = [];
  
    for (const folderUri of workspaceFolders) {
      const folderPath = new URL(folderUri).pathname; // Convert URI to file path
  
      // Define the `bin` folder path
      const binFolderPath = path.join(folderPath, 'bin');
  
      if (fs.existsSync(binFolderPath) && fs.statSync(binFolderPath).isDirectory()) {
        const files = fs.readdirSync(binFolderPath);
  
        // Check for `.fan` files
        const fanFiles = files.filter(file => file.endsWith('.fan'));
        if (fanFiles.length > 0) {
          results.push(binFolderPath);
          logMessage(
            'info',
            `Found bin folder with fan files: ${binFolderPath}`,
            '[SEARCH]',
            connection
          );
        }
      }
    }
  
    if (results.length === 0) {
      logMessage('warn', 'No bin folders with fan files found in workspace', '[SEARCH]', connection);
    }
  
    return results;
  }

  async function getFanExecutable(): Promise<string> {
    const fanHome = await getFanHome();
    return process.platform === 'win32' ? path.join(fanHome, 'bin', 'fan.bat') : path.join(fanHome, 'bin', 'fan');
}

async function getFanDocsPath(): Promise<string> {
    const fanHome = await getFanHome();
    return path.resolve(fanHome, 'vscode', 'fantom-docs.json');
}

async function getFanNavPath(): Promise<string> {
    const fanHome = await getFanHome();
    return path.resolve(fanHome, 'vscode', 'fantom-docs-nav.json');
}


export async function getFantomDocs(): Promise<FantomDocStructure> {
    // console.log("GETTING FANTOM DOCS");

    const docsPath = await getFanDocsPath();

    return new Promise((resolve, reject) => {
        fs.readFile(docsPath, 'utf8', (err, data) => {
            if (err) {
                reject(`Error reading Fantom docs file: ${err.message}`);
                return;
            }

            try {
                const docs = JSON.parse(data);
                console.log(`GOT DOCS from ${docsPath}`);
                resolve(docs);
            } catch (parseErr: any) {
                reject(`Error parsing Fantom docs JSON: ${parseErr.message}`);
            }
        });
    });
}

export async function getFantomNav(): Promise<FantomNavStructure> {
    // console.log("GETTING FANTOM NAV");

    const docsPath = await getFanNavPath();

    return new Promise((resolve, reject) => {
        fs.readFile(docsPath, 'utf8', (err, data) => {
            if (err) {
                reject(`Error reading Fantom docs file: ${err.message}`);
                return;
            }

            try {
                const docs = JSON.parse(data);
                console.log(`GOT NAV from ${docsPath}`);
                resolve(docs);
            } catch (parseErr: any) {
                reject(`Error parsing Fantom docs JSON: ${parseErr.message}`);
            }
        });
    });
}

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
