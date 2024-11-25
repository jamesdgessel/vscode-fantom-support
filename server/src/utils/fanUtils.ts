import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';


// Execute a Fantom command
export function executeFanCmd(scriptName: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const fantomExecutable = "fan"; // Ensure "fan" is in your system PATH
        const fantomScriptPath = path.resolve(__dirname, "src/fantom", scriptName);

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
export function runFanFile(scriptName: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const fantomExecutable = "fan"; // Ensure "fan" is in your system PATH
        const fantomScriptPath = path.resolve(__dirname, "src/fantom", scriptName);

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
export function fanDocLookup(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log(`Current directory: ${__dirname}`);
        const fanHome = process.env.FAN_HOME;
        if (!fanHome) {
            reject('FAN_HOME environment variable is not set. Please set FAN_HOME to your Fantom installation directory.');
            return;
        }

        // Determine the Fantom executable based on the operating system
        let fantomExecutable = '';
        let fantomArgs: string[] = [];
        const fantomScriptPath = path.resolve(__dirname, "../server/fan/docLookup.fan");
        if (process.platform === 'win32') {
            fantomExecutable = path.join(fanHome, 'bin', 'fan.bat');
            fantomArgs = [fantomScriptPath, input];
        } else {
            fantomExecutable = path.join(fanHome, 'bin', 'fan');
            fantomArgs = [fantomScriptPath, input];
        }

        // Check if the Fantom executable exists
        if (!fs.existsSync(fantomExecutable)) {
            reject(`Fantom executable not found at "${fantomExecutable}". Please ensure Fantom is installed correctly and FAN_HOME is set.`);
            return;
        }

        // Check if the Fantom script exists
        if (!fs.existsSync(fantomScriptPath)) {
            reject(`Fantom script not found at "${fantomScriptPath}". Please ensure the script exists.`);
            return;
        }

        // On Windows, execute fan.bat via cmd.exe
        if (process.platform === 'win32') {
            execFile('cmd.exe', ['/c', fantomExecutable, fantomScriptPath, input], (error, stdout, stderr) => {
                if (error) {
                    const errorMessage = `Error executing Fantom script "${fantomScriptPath}": ${stderr || error.message}`;
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
            execFile(fantomExecutable, fantomArgs, (error, stdout, stderr) => {
                if (error) {
                    const errorMessage = `Error executing Fantom script "${fantomScriptPath}": ${stderr || error.message}`;
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

/**
 * General function to execute a Fantom script with specified arguments.
 * @param scriptPath The path to the Fantom script file.
 * @param args Arguments to pass to the Fantom script.
 * @returns A Promise that resolves to the script's output, or rejects with an error.
 */
export function executeFanScript(scriptPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const fanHome = process.env.FAN_HOME;
        if (!fanHome) {
            reject('FAN_HOME environment variable is not set. Please set FAN_HOME to your Fantom installation directory.');
            return;
        }

        // Determine the Fantom executable based on the operating system
        let fantomExecutable = '';
        if (process.platform === 'win32') {
            fantomExecutable = path.join(fanHome, 'bin', 'fan.bat');
        } else {
            fantomExecutable = path.join(fanHome, 'bin', 'fan');
        }

        // Check if the Fantom executable exists
        if (!fs.existsSync(fantomExecutable)) {
            reject(`Fantom executable not found at "${fantomExecutable}". Please ensure Fantom is installed correctly and FAN_HOME is set.`);
            return;
        }

        // Check if the Fantom script exists
        if (!fs.existsSync(scriptPath)) {
            reject(`Fantom script not found at "${scriptPath}". Please ensure the script exists.`);
            return;
        }

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

function getFanHome(): string {
    const fanHome = process.env.FAN_HOME;
    if (!fanHome) {
        throw new Error('FAN_HOME environment variable is not set. Please set FAN_HOME to your Fantom installation directory.');
    }
    return fanHome;
}

function getFanExecutable(): string {
    const fanHome = getFanHome();
    return process.platform === 'win32' ? path.join(fanHome, 'bin', 'fan.bat') : path.join(fanHome, 'bin', 'fan');
}

function getFanDocsPath(): string {
    const fanHome = getFanHome();
    return path.resolve(fanHome, 'vscode', 'fantom-docs.json');
}
function getFanNavPath(): string {
    const fanHome = getFanHome();
    return path.resolve(fanHome, 'vscode', 'fantom-docs-nav.json');
}

export async function getFantomDocs(): Promise<FantomDocStructure> {
    console.log("GETTING FANTOM DOCS");

    const docsPath = getFanDocsPath();

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
    console.log("GETTING FANTOM NAV");

    const docsPath = getFanNavPath();

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
