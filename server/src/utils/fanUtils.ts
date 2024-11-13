import { execFile } from 'child_process';
import * as path from 'path';

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