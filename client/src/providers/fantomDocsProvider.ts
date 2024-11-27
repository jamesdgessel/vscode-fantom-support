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
