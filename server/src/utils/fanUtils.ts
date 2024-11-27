import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logMessage } from './notify'; 

export type FantomDocStructure = 
{
    name: string;
    type: string;
    classes: {  name: string; 
                type: string;
                facets: string[];
                methods: {  
                    name: string; 
                    type: string;
                    params: {
                        name: string; 
                        type: string;
                    }[];
                }[];
                fields: { 
                    name: string; 
                    type: string;
                }[];
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
export class FanEnv {

    public fanHome: string;
    public fanExecutable: string;
    public platform: string = process.platform;

    public constructor(
        fanHome: string,
        fanExecutable: string,
    ) {

        logMessage('info', 'Initializing FanEnv', '[FANTOM]');
        
        this.fanHome = fanHome;
        this.fanExecutable = fanExecutable;

        // Verify that the fanHome directory exists
        if (!fs.existsSync(this.fanHome)) {
            const errorMessage = `Fantom home directory not found at "${this.fanHome}". Please ensure the directory exists.`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error(errorMessage);
        }

        // Verify that the fanExecutable exists
        if (!fs.existsSync(this.fanExecutable)) {
            const errorMessage = `Fantom executable not found at "${this.fanExecutable}". Please ensure the executable exists.`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error(errorMessage);
        }

        logMessage('info', `Fantom environment initialized with home: "${this.fanHome}" and executable: "${this.fanExecutable}"`, '[FANTOM]');
    }

    static async create(fanMode: string = 'global', workspace?: string): Promise<FanEnv> {
        const fanHome = await FanEnv.resolveFanHome(fanMode, workspace);
        const fanExecutable = await FanEnv.resolveFanExecutable(fanHome);
        return new FanEnv(fanHome, fanExecutable);
    }

    public static async resolveFanHome(homeMode: string, workspace?:string, customHome?: string): Promise<string> {

        // Ensure homeMode is one of 'global', 'local', or 'custom'
        const validHomeModes = ['global', 'local', 'custom'];
        if (!validHomeModes.includes(homeMode)) {
            throw new Error(`Invalid homeMode: ${homeMode}. Please set 'homeMode' to 'custom', 'local', or 'global' in settings.`);
        }

        logMessage('info', `Fantom home mode: ${homeMode}`, '[FANTOM]');
    
        const isValidPath = (p: string): boolean => fs.existsSync(p);
        const workspacePath = path.resolve(workspace || '');
    
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
            const customPath = customHome;
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

    /**
     * Resolve the Fantom executable path.
     */
    public static async resolveFanExecutable(fanHome: string): Promise<string> {
        logMessage('info', `Resolving fan executable`, '[FANTOM]');
        logMessage('info', `Platform: ${process.platform}`, '[FANTOM]');
        const executablePath = process.platform === 'win32'
            ? path.join(fanHome, 'bin', 'fan.bat')
            : path.join(fanHome, 'bin', 'fan');

        if (!fs.existsSync(executablePath)) {
            const errorMessage = `Fantom executable not found at "${executablePath}". Please ensure Fantom is installed correctly.`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error(errorMessage);
        }

        logMessage('info', `Fantom executable resolved to: ${executablePath}`, '[FANTOM]');
        return executablePath;
    }

    public async runFanFile(fantomScriptPath: string, args: string[]): Promise<string> {
        let absoluteScriptPath = path.resolve(fantomScriptPath);
        logMessage('info', `Executing Fantom script: "${absoluteScriptPath}" with args: ${args.join(' ')}`, '[FANTOM]');
        
        
    
        // Check if the Fantom script exists
        if (!fs.existsSync(absoluteScriptPath)) {
            const errorMessage = `Fantom script not found at "${absoluteScriptPath}". Please ensure the script exists.`;
            logMessage('err', errorMessage, '[FANTOM]');
            throw new Error(errorMessage);
        }

        let command = `"${this.fanExecutable}" "${absoluteScriptPath}" "${args.join(' ')}"`;

        return this.executeFanCmd(command)
    
        
    }

    public async executeFanCmd (command: string): Promise<string> {

        // Convert backslashes to forward slashes for Windows paths
        if (this.platform === 'win32') {
            command = command.replace("\\", "/");
        }

        return new Promise((resolve, reject) => {
            // Properly quote the executable and script paths
            const executable = `"${this.fanExecutable}"`;
    
            // Construct the command string
            logMessage('info', `Constructed command: ${command}`, '[FANTOM]');
    
            exec(command, (error, stdout, stderr) => {
                logMessage('debug', `Executing....`, '[FANTOM]');
                if (error) {
                    const errorMessage = `Error executing Fantom cmd: <${command}>: \n trace: ${stderr || error.message}`;
                    logMessage('err', errorMessage, '[FANTOM]');
                    reject(new Error(errorMessage));
                    return;
                }
                if (stderr) {
                    logMessage('warn', `Fantom script stderr: ${stderr}`, '[FANTOM]');
                }
                logMessage('info', `Fantom cmd output: ${stdout.trim()}`, '[FANTOM]');
                resolve(stdout.trim());
            });
        });
    }
}
