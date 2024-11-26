// src/fantomDocsProvider.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { logMessage } from '../../../server/src/utils/notify';
import { execFile } from 'child_process';


let debug = false; // Initialize debug flag

// Update debug flag when configuration changes
vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('fantomDocs')) {
        const fantomConfig = vscode.workspace.getConfiguration('fantomDocs');
        debug = fantomConfig.get<boolean>('enableLogging', false);
    }
});

/**
 * Enum representing the types of items in the Fantom Docs tree.
 */
export enum FantomDocType {
    Pod = 'pod',
    Class = 'class',
    Method = 'method',
    Field = 'field',
}

/**
 * Fantom config class to manage the extension configuration.
 */
export class FantomConfig {

    public fanHome: string;
    public fanExecutable: string;

    public fanDocsPath: string;

    private config: vscode.WorkspaceConfiguration;
    private fanBuildDocsPath = "../../server/src/fan/buildDocs.fan";

    private constructor() {
        this.config = vscode.workspace.getConfiguration('fantomDocs');

        this.fanHome = this.resolveFanHome();
        this.fanDocsPath = this.resolveFanDocsPath();
        this.fanExecutable = path.join(this.fanHome,'bin','fan');
    }

    /**
     * Factory method to initialize the configuration
     */
    public static async init(): Promise<FantomConfig> {
        const instance = new FantomConfig();
        await instance.validatePaths();
        return instance;
    }

    /**
     * Validate essential paths and log warnings if not found.
     */
    private async validatePaths() {

        const docPath = path.join(this.fanDocsPath, 'vscode', 'fantom-docs.json');
        const navPath = path.join(this.fanDocsPath, 'vscode', 'fantom-docs-nav.json');

        if (!this.fanHome || !fs.existsSync(this.fanHome)) {
            logMessage('err', `Invalid FAN_HOME: ${this.fanHome}`, '[FAN CONFIG]');
            throw new Error('FAN_HOME is not properly configured.');
        }

        if (!fs.existsSync(docPath)) {
            logMessage('warn', `Fantom Docs file missing at ${docPath}`, '[FAN CONFIG]');
        }

        if (!fs.existsSync(navPath)) {
            logMessage('warn', `Fantom Nav file missing at ${navPath}`, '[FAN CONFIG]');
        }
    }

    /**
     * Retrieve a specific configuration value.
     */
    public get<T>(section: string): T | undefined {
        return this.config.get<T>(section);
    }

    /**
     * Resolve the Fantom executable path.
     */
    public getFanExecutable(): string {
        return process.platform === 'win32'
            ? path.join(this.fanHome, 'bin', 'fan.bat')
            : path.join(this.fanHome, 'bin', 'fan');
    }

    /**
     * Utility method to read and parse a JSON file.
     */
    private async readJsonFile(filePath: string): Promise<object> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }

    public async docs(): Promise<object> {
        return this.readJsonFile(path.join(this.fanDocsPath, 'vscode','fantom-docs.json'));
    }
    public async nav(): Promise<object> {
        return this.readJsonFile(path.join(this.fanDocsPath, 'vscode','fantom-docs-nav.json'));
    }

    private resolveFanHome(): string {
    
        const homeMode = this.config.fantom.homeMode;

        // Check custom path
        if (homeMode === 'custom') {
            const customPath = this.config.fantom.homeCustom;
            if (customPath && fs.existsSync(customPath)) {
                logMessage('info', 'Using custom Fantom docs path.', '[FANTOM]');
                return customPath;
            }
            logMessage('info', 'Custom path not found. Falling back to local.', '[FANTOM]');
        }
    
        // // Check local path
        // if (homeMode === 'local' || settings.fantom.homeMode === 'custom') {
        //     const workspacePath = await findWorkspaceBinPath();
        //     if (workspacePath) {
        //         logMessage('info', 'Using local Fantom docs path.', '[FANTOM]', connection);
        //         return workspacePath;
        //     }
        //     logMessage('info', 'Local path not found. Falling back to global.', '[FANTOM]', connection);
        // }
    
        // Check global path
        const fanHome = process.env.FAN_HOME;
        if (fanHome && fs.existsSync(fanHome)) {
            logMessage('info', 'Using global Fantom docs path.', '[FANTOM]');
            return fanHome;
        }
    
        throw new Error('Fantom docs path not found. Please set "docStore" to "custom", "global", or "local" in settings.');
    }

    private resolveFanDocsPath(): string {

        switch (this.config.fantom.docStoreMode) {
            case 'fanHome':
                return path.join(this.fanHome, 'vscode');
            case 'custom':
                return this.config.fantom.docStoreCustom;
            default:
                throw new Error('Invalid Fantom docs store mode.');
        }
    }

    public async executeFanCmd (scriptName: string, args: string[]): Promise<string> {
        const fantomExecutable = this.fanExecutable;
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

    public async runFanFile(fantomScriptPath: string, args: string[]): Promise<string> {
    
        return new Promise((resolve, reject) => {
            execFile(this.fanExecutable, [fantomScriptPath, ...args], (error, stdout, stderr) => {
                if (error) {
                    reject(`Error executing Fantom script: ${stderr || error.message}`);
                    return;
                }
                resolve(stdout.trim());
            });
        });
    }

    public initFantomDocs(): Promise<string> {
        logMessage('info', 'Initializing Fantom docs.', '[FANTOM]');
        try {
            const out = this.runFanFile(this.fanBuildDocsPath,[]);
            logMessage('info', 'Built Fantom docs.', '[FANTOM]');
            console.log(out);
            return out; // Return the output here
        } catch (error) {
            console.error("Error initializing Fantom docs:", error);
            return Promise.reject("Error initializing Fantom docs. Please check the logs for more details.");
        }
    }

    
}


/**
 * Represents a single item in the Fantom Docs tree.
 */
class FantomDocItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: FantomDocType,
        public readonly qname: string,
        public readonly documentation: string,
        public readonly details: { name: string; type: string; qname: string; public: Boolean; base?: string },
        public readonly parent?: FantomDocItem
    ) {
        super(label, collapsibleState);

        this.iconPath = this.getIconPath(type);
        this.tooltip = this.qname;

        if (this.type === FantomDocType.Method || this.type === FantomDocType.Field) {
            const podName = this.qname.split('::')[0];
            const parentPodName = this.parent?.qname.split('::')[0]; // Assuming parent pod name is part of parent's qname
            if (podName !== parentPodName) {
            this.description = ` <- ${podName}`;
            }
            if (this.details.public === false) {
                this.description = (this.description || '') + ' [private]';
            }
        }

        if (this.type === FantomDocType.Class) {
            if (this.details.public == false) {
            this.description = 'Private';
            this.iconPath = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('disabledForeground'));
            if (this.details.base) {
                this.description += ` (Base: ${this.details.base})`;
            }
            }
        }

        // Fix the command structure
        this.command = {
            command: 'fantomDocs.showDetails',
            title: 'Show Details',
            arguments: [
                {
                    label: this.label,
                    type: this.type,
                    documentation: this.documentation || 'No docs yet...', 
                    qname: this.qname,
                },
            ],
        };
    }

    private getIconPath(type: FantomDocType): vscode.ThemeIcon {
        switch (type) {
            case FantomDocType.Pod:
                return new vscode.ThemeIcon('package');
            case FantomDocType.Class:
                return new vscode.ThemeIcon('symbol-class');
            case FantomDocType.Method:
                return new vscode.ThemeIcon('symbol-method');
            case FantomDocType.Field:
                return new vscode.ThemeIcon('symbol-field');
            default:
                return new vscode.ThemeIcon('question');
        }
    }
}

/**
 * Provides data for the Fantom Docs tree view.
 */
export class FantomDocsProvider implements vscode.TreeDataProvider<FantomDocItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FantomDocItem | undefined | void> = new vscode.EventEmitter<
        FantomDocItem | undefined | void
    >();
    readonly onDidChangeTreeData: vscode.Event<FantomDocItem | undefined | void> = this._onDidChangeTreeData.event;

    private pods: {
        name: string;
        type: string;
        qname: string;
        classes: {
            name: string;
            type: string;
            qname: string;
            public: Boolean;
            methods: { name: string; type: string; qname: string; public: Boolean}[];
            fields: { name: string; type: string; qname: string; public: Boolean }[];
        }[];
    }[] = [];

    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel, private context: vscode.ExtensionContext) {
        this.outputChannel = outputChannel;

        // Load pods data from static JSON file
        const jsonFilePath = path.join(process.env.FAN_HOME || '', 'vscode', 'fantom-docs-nav.json');
        this.logDebug(`Fan Home: ${process.env.FAN_HOME || ''}`);
        this.logDebug(`Reading JSON file from: ${jsonFilePath}`);
        if (fs.existsSync(jsonFilePath)) {
            const podsData = fs.readFileSync(jsonFilePath, 'utf-8');
            this.pods = JSON.parse(podsData);
        } else {
            this.logDebug(`JSON file not found at ${jsonFilePath}. Initializing with empty pods.`);
            this.pods = [];
        }

        // Read initial debug configuration
        debug = true;
    }

    // Helper function for debug logging
    private logDebug(message: string) {
        if (debug) {
            this.outputChannel.appendLine(message);
        }
    }

    /**
     * Refreshes the tree view.
     */
    refresh(): void {
        this.logDebug('Refreshing FantomDocsProvider tree view');
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FantomDocItem): vscode.TreeItem {
        // this.logDebug(`Getting tree item for: ${element.label}`);
        return element;
    }

    getChildren(element?: FantomDocItem): Thenable<FantomDocItem[]> {
        this.logDebug('Getting children for element: ' + (element ? element.label : 'root'));
        if (!element) {
            // Root elements: Pods
            return Promise.resolve(
                this.pods.map(
                    (pod) =>
                        new FantomDocItem(
                            pod.name,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            FantomDocType.Pod,
                            `pod: ${pod.qname}`,
                            `Children for Pod: ${pod.name}`,
                            { ...pod, public: true }
                        )
                )
            );
        }

        switch (element.type) {
            case FantomDocType.Pod:
                // Children: Classes
                const classes = this.pods.find((p) => p.name === element.label)?.classes || [];
                return Promise.resolve(
                    classes.map(
                        (cls) =>
                            new FantomDocItem(
                                cls.name,
                                vscode.TreeItemCollapsibleState.Collapsed,
                                FantomDocType.Class,
                                cls.qname,
                                `Children for Class: ${cls.name}`,
                                cls,
                                element // Set parent as the current pod element
                            )
                    )
                );
            case FantomDocType.Class:
                // Children: Fields and Methods
                const classItem = this.pods
                    .flatMap((pod) => pod.classes)
                    .find((cls) => cls.name === element.label);
                const methods = classItem?.methods || [];
                const fields = classItem?.fields || [];

                const fieldItems = fields.map(
                    (field) =>
                        new FantomDocItem(
                            field.name,
                            vscode.TreeItemCollapsibleState.None,
                            FantomDocType.Field,
                            field.qname,
                            field.type,
                            field,
                            element // Set parent as the current class element
                        )
                );

                const methodItems = methods.map(
                    (method) =>
                        new FantomDocItem(
                            method.name,
                            vscode.TreeItemCollapsibleState.None,
                            FantomDocType.Method,
                            method.qname,
                            method.type,
                            method,
                            element // Set parent as the current class element
                        )
                );

                // Sort methods to place inherited methods last
                const sortedMethodItems = methodItems.sort((a, b) => {
                    const aInherited = typeof a.description === 'string' && a.description.includes('<-');
                    const bInherited = typeof b.description === 'string' && b.description.includes('<-');
                    return aInherited === bInherited ? 0 : aInherited ? 1 : -1;
                });

                return Promise.resolve([...fieldItems, ...sortedMethodItems]);
            case FantomDocType.Method:
                // No children
                return Promise.resolve([]);
            default:
                return Promise.resolve([]);
        }
    }
}

export class FantomDocsDetailsProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private outputChannel: vscode.OutputChannel;

    constructor(private readonly context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;

        // Read initial debug configuration
        debug = true;
    }
                        

    // Helper function for debug logging
    private logDebug(message: string) {
        if (debug) {
            this.outputChannel.appendLine(message);
        }
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        this.logDebug('Resolving webview view');

        // Set up the webview
        webviewView.webview.options = {
            enableScripts: true,
        };

        // Initial content
        webviewView.webview.html = this.getHtmlContent().replace('{name}', 'Select a slot to see details.');

        // Add message listener to handle updates without full HTML reload
        webviewView.webview.onDidReceiveMessage(message => {
            if (message.type === 'updateContent' && message.detail) {
                // Implement partial update logic here
                // Example: Update specific sections based on message.detail
            }
        });
    }

    /**
     * Update the webview content with the selected item's details in markdown format.
     */
    showSlotDetails(label: string, type: string, qname: string) {
        this.logDebug(` ---------------------------------------------------------------------- `);
        this.logDebug(` --- Searching for "${qname}" --- `);

        // Load slot details from JSON file
        const jsonFilePath = path.join(process.env.FAN_HOME || '', 'vscode', 'fantom-docs.json');
        const slotDetailsData = fs.readFileSync(jsonFilePath, 'utf-8');
        const slotDetails = JSON.parse(slotDetailsData);

        let detail;
        if (type === FantomDocType.Pod) 
        {
            this.logDebug(` > Finding details for Pod: ${label}`);
            // Find the pod details
            detail = slotDetails.find((item: any) => item.name === label );

        } 
        else if (type === FantomDocType.Class) 
        {
            this.logDebug(` > Finding details for Class: ${qname}`);
            // Extract pod name from qname and find the pod details
            const podName = qname.split('::')[0];
            this.logDebug(`  - pod identified: ${podName}`);
            const podDetail = slotDetails.find((item: any) => item.name === podName && item.type === FantomDocType.Pod);
            this.logDebug(`  - pod index: ${podDetail}`);
            if (podDetail) {
            this.logDebug(`  - pod found: ${podName}, searching for Class: ${qname}`);
            // Find the class details within the pod
            detail = podDetail.classes.find((cls: any) => cls.qname === qname);
            }
        } 
        else if (type === FantomDocType.Method || type === FantomDocType.Field) 
        {
            this.logDebug(` > Finding details for Class: ${qname}`);
            // Extract pod name from qname and find the pod details
            const podName = qname.split('::')[0];
            const className = qname.split('::')[1].split(".")[0];

            this.logDebug(`  - pod/class identified: ${podName}/${className}`);
            const podDetail = slotDetails.find((item: any) => item.name === podName && item.type === FantomDocType.Pod);
            if (podDetail) {
            this.logDebug(`  - pod found: ${podName}, searching for Class: ${qname}`);
            
            // Find the class details within the pod
            const classDetail = podDetail.classes.find((cls: any) => cls.qname === `${podName}::${className}`);
            if (classDetail) {
                this.logDebug(`  - class found: ${className}, searching for ${type}: ${qname}`);
                // Find the method or field details within the class
                detail = type === FantomDocType.Method
                ? classDetail.methods.find((method: any) => method.qname === qname)
                : classDetail.fields.find((field: any) => field.qname === qname);
                }
            }
        }

        if (detail) {
            this.logDebug(` --- Detail found for ${qname} --- `);
        } else {
            this.logDebug(` --- No detail found for ${qname} --- `);
        }

        // If details are found, format them using the HTML template
        const content = detail
            ? this.formatHtml(detail)
            : this.formatHtml({
                name: label,
                type: 'Unknown',
                qname: '',
                documentation: 'No documentation available.',
                returns: 'N/A',
            });

        // this.logDebug(`Formatted content:\n${content}`);

        if (this._view) {
        this._view.show?.(true); // Bring the view into focus
        this._view.webview.html = content; // Set the formatted HTML as the webview content
        }
        this.logDebug(` ---------------------------------------------------------------------- `);

    }

    /**
     * Format the slot details into full HTML using the template.
     */
    private formatHtml(detail: any): string {
        let formattedHtml = this.getHtmlContent();
        for (const [key, value] of Object.entries(detail)) {
            const placeholder = `{${key}}`;
            formattedHtml = formattedHtml.replace(new RegExp(placeholder, 'g'), String(value) || '');
        }
    
        // Generate the link based on the type and qname
    if (detail.qname) {
        const qnameParts = detail.qname.split(/[:.]/); // Split by '::' or '.'
        this.logDebug(qnameParts.toString());
        let link = "";

        if (detail.qname.startsWith("Pod::")) {
            link = `${qnameParts[2]}`; // Use only 'name' from 'Pod::name'
        } else {
            link = `${qnameParts[0]}`; // Start with the pod
            if (qnameParts.length > 2) {
                link += `/${qnameParts[2]}`; // Add the class if it exists
            }
            if (qnameParts.length > 3) {
                link += `#${qnameParts[3]}`; // Add the method or field if it exists
         }
        }

        formattedHtml = formattedHtml.replace(/{endpoint}/g, link);
    }

    
        return formattedHtml;
    }
    
    


    /**
     * Wrap HTML content with basic structure.
     */
    private getHtmlContent(): string {
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Slot Details</title>
                <style>
                    body {
                        font-family: 'Segoe UI', sans-serif;
                        margin: 0;
                        padding: 16px;
                        background-color: #1e1e1e;
                        color: #d4d4d4;
                    }

                    h1 {
                        font-size: 1.6rem;
                        color: #569cd6;
                        border-bottom: 1px solid #3c3c3c;
                        padding-bottom: 8px;
                        margin-bottom: 16px;
                    }

                    .section {
                        margin-bottom: 16px;
                    }

                    .section-title {
                        font-weight: bold;
                        color: #dcdcaa;
                        margin-bottom: 4px;
                    }

                    .section-content {
                        margin-left: 12px;
                        color: #d4d4d4;
                    }

                    a {
                        color: #569cd6;
                        text-decoration: none;
                    }

                    a:hover {
                        text-decoration: underline;
                    }

                    .footer {
                        margin-top: 24px;
                        font-size: 0.9rem;
                        text-align: center;
                        color: #808080;
                    }
                </style>
            </head>
            <body>
                <h3><a href="https://fantom.org/doc/{endpoint}">{qname}</h3>
                <div class="section">
                    <div style="color: gray !important;" class="section-title">{type}</div>
                </div>
                <div class="section">
                    <div class="section-title">Documentation</div>
                    <div class="section-content">{doc}</div>
                </div>
                <div class="section">
                    <div class="section-title">Returns</div>
                    <div class="section-content">{returns}</div>
                </div>
                <div class="footer">
                </div>
            </body>
            </html>`;


        // this.logDebug(`Generated HTML template:\n${html}`);
        return html;
    }
}
