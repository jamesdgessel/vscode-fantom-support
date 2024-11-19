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
        const fanHome = process.env.FAN_HOME;
        if (!fanHome) {
            reject('FAN_HOME environment variable is not set. Please set FAN_HOME to your Fantom installation directory.');
            return;
        }

        // Determine the Fantom executable based on the operating system
        let fantomExecutable = '';
        let fantomArgs: string[] = [];
        if (process.platform === 'win32') {
            fantomExecutable = path.join(fanHome, 'bin', 'fan.bat');
            fantomArgs = [path.resolve(__dirname, "../../src/fan/docLookup.fan"), input];
        } else {
            fantomExecutable = path.join(fanHome, 'bin', 'fan');
            fantomArgs = [path.resolve(__dirname, "../../src/fan/docLookup.fan"), input];
        }

        // Check if the Fantom executable exists
        if (!fs.existsSync(fantomExecutable)) {
            reject(`Fantom executable not found at "${fantomExecutable}". Please ensure Fantom is installed correctly and FAN_HOME is set.`);
            return;
        }

        // Check if the Fantom script exists
        const fantomScriptPath = fantomArgs[0];
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