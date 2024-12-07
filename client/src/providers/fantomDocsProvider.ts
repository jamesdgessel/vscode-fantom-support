// src/fantomDocsProvider.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LANGUAGE_SERVER_ID } from '../extension'
import { BaseItem, GroupItem, PodItem, ClassItem, MethodItem, FieldItem } from './fantomTreeItem';
import { FantomDocType } from './fantomDocsStructure';
import { podGroup, groups } from './fantomDocsStructure';

let favPods: string[] = vscode.workspace.getConfiguration('fantomLanguageServer').fantomDocs.favPods || ['sys', 'domkit'];
let debug: boolean = vscode.workspace.getConfiguration('fantomLanguageServer').fantomDocs.debug || false;

/**
 * Provides data for the Fantom Docs tree view.
 */
export class FantomDocsProvider implements vscode.TreeDataProvider<BaseItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BaseItem | undefined | void> = new vscode.EventEmitter<
        BaseItem | undefined | void
    >();
    readonly onDidChangeTreeData: vscode.Event<BaseItem | undefined | void> = this._onDidChangeTreeData.event;

    private pods: {
        name: string;
        type: string;
        qname: string;
        group: string;
        classes: {
            name: string;
            type: string;
            qname: string;
            public: Boolean;
            mods: string;
            parent: string;
            inherits: string[];
            methods: { name: string; type: string; qname: string; public: Boolean; mods: string; returns:string;}[];
            fields: { name: string; type: string; qname: string; public: Boolean; mods: string;}[];
        }[];
    }[] = [];

    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel, private context: vscode.ExtensionContext) {
        this.outputChannel = outputChannel;

        // Load pods data from static JSON file
        const jsonFilePath = path.join(this.context.extensionPath, 'out/docs', 'fantom-docs-nav.json');
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
        if (true) {
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

    /**
     *  Updates a specific tree item.
     */
    updateTreeItem(item: BaseItem): void {
        this.logDebug(`Updating tree item: ${item.label}`);
        this._onDidChangeTreeData.fire(item);
    }

    getTreeItem(element: BaseItem): vscode.TreeItem {
        // this.logDebug(`Getting tree item for: ${element.label}`);
        return element;
    }

    getChildren(element?: BaseItem): Thenable<BaseItem[]> {
        this.logDebug('Getting children for element: ' + (element ? element.label : 'root'));
        if (!element) {
            // Root elements: Groups
            return Promise.resolve(
                groups.map((grp) =>new GroupItem(grp, FantomDocType.Group))
            );
        }

        switch (element.type) {
            case FantomDocType.Group: 
                return Promise.resolve(
                    this.pods
                        .filter((p) => podGroup(p.name) === element.label)
                        .sort((a, b) => {
                            const aFav = favPods.includes(a.name);
                            const bFav = favPods.includes(b.name);
                            if (aFav && !bFav) return -1;
                            if (!aFav && bFav) return 1;
                            return a.name.localeCompare(b.name);
                        })
                        .map((pod) => new PodItem( pod.name, FantomDocType.Pod, pod ))
                );
            case FantomDocType.Pod:
                // Children: Classes
                const pod = this.pods.find((p) => p.name === element.label);
                const classes = pod?.classes || [];
                return Promise.resolve(
                    classes
                        .sort((a, b) => {
                            // Sort by public status (public classes first)
                            if (a.public !== b.public) {
                                return a.public ? -1 : 1;
                            }
                            // Sort alphabetically by name
                            return a.name.localeCompare(b.name);
                        })
                        .map((cls) => new ClassItem(cls.name, FantomDocType.Class, cls))
                );
            case FantomDocType.Class:
                // Children: Fields and Methods
                const classItem = this.pods
                    .flatMap((pod) => pod.classes)
                    .find((cls) => cls.name === element.label);
                const methods = classItem?.methods || [];
                const fields = classItem?.fields || [];

                const fieldItems =  fields.map((field)   => new FieldItem(field.name,  FantomDocType.Field,  field));
                const methodItems = methods.map((method) => new MethodItem(method.name, FantomDocType.Method, method));

                // Combine fields and methods, then sort by type, name, and inherited status
                const sortedChildren = [...fieldItems, ...methodItems].sort((a, b) => {
                    // Sort by type: Field before Method
                    if (a.type !== b.type) {
                        return a.type === FantomDocType.Field ? -1 : 1;
                    }
                    // Sort alphabetically by name
                    const nameComparison = a.label.localeCompare(b.label);
                    if (nameComparison !== 0) {
                        return nameComparison;
                    }
                    // Sort by inherited status (inherited items last)
                    const aInherited = typeof a.description === 'string' && a.description.includes('<-');
                    const bInherited = typeof b.description === 'string' && b.description.includes('<-');
                    return aInherited === bInherited ? 0 : aInherited ? 1 : -1;
                });

                return Promise.resolve(sortedChildren);
            case FantomDocType.Method:
                // No children
                return Promise.resolve([]);
            default:
                return Promise.resolve([]);
        }
    }

    /**
     * Searches the tree for items matching the given string.
     * @param query The search string.
     * @returns A list of matching BaseItems.
     */
    search(query: string): Thenable<BaseItem[]> {
        const matches: BaseItem[] = [];
        const lowerQuery = query.toLowerCase();
    
        const searchInItems = async (items: Thenable<BaseItem[]> | BaseItem[]) => {
            const resolvedItems = items instanceof Promise ? await items : items; // Resolve the promise if needed
    
            for (const item of resolvedItems) {
                // Match query
                if (item.label.toLowerCase().includes(lowerQuery) || item.qname.toLowerCase().includes(lowerQuery)) {
                    matches.push(item);
                }
    
                // Check children
                if (item.collapsibleState !== vscode.TreeItemCollapsibleState.None) {
                    const children = this.getChildren(item); // May return Thenable
                    await searchInItems(children); // Recursively search children
                }
            }
        };
    
        return this.getChildren().then(async (rootItems) => {
            await searchInItems(rootItems);
            return matches;
        });
    }
    



    /**
     * Adds a pod to the favorites.
     * @param item The BaseItem representing the pod.
     * @param provider The FantomDocsProvider instance.
     */
    addFavPod(item: BaseItem) {
        const config = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
        let favPods: string[] = config.get<string[]>('fantomDocs.favPods', []);
        this.logDebug(`Current favorite pods before adding: ${JSON.stringify(favPods)}`);

        if (!favPods.includes(item.label)) {
            favPods.push(item.label);
            config.update('fantomDocs.favPods', favPods, vscode.ConfigurationTarget.Workspace).then(() => {
                this.logDebug(`Successfully added ${item.label} to favorites.`);
                vscode.window.showInformationMessage(`${item.label} added to favorites.`);
                this.refresh(); // Refresh the tree view
            }, (error) => {
                this.logDebug(`Failed to add ${item.label} to favorites: ${error}`);
                vscode.window.showErrorMessage(`Failed to add ${item.label} to favorites.`);
            });
        } else {
            this.logDebug(`${item.label} is already a favorite.`);
            vscode.window.showInformationMessage(`${item.label} is already a favorite.`);
        }

        this.updateTreeItem(item);
    }

    /**
     * Removes a pod from the favorites.
     * @param item The BaseItem representing the pod.
     * @param provider The FantomDocsProvider instance.
     */
    removeFavPod(item: BaseItem) {
        const config = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
        let favPods: string[] = config.get<string[]>('fantomDocs.favPods', []);
        this.logDebug(`Current favorite pods before removing: ${JSON.stringify(favPods)}`);

        if (favPods.includes(item.label)) {
            favPods = favPods.filter(pod => pod !== item.label);
            config.update('fantomDocs.favPods', favPods, vscode.ConfigurationTarget.Workspace).then(() => {
                this.logDebug(`Successfully removed ${item.label} from favorites.`);
                vscode.window.showInformationMessage(`${item.label} removed from favorites.`);
                this.refresh(); // Refresh the tree view
            }, (error) => {
                this.logDebug(`Failed to remove ${item.label} from favorites: ${error}`);
                vscode.window.showErrorMessage(`Failed to remove ${item.label} from favorites.`);
            });
        } else {
            this.logDebug(`${item.label} is not a favorite.`);
            vscode.window.showInformationMessage(`${item.label} is not a favorite.`);
        }

        this.updateTreeItem(item);
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
        webviewView.webview.html =  webviewView.webview.html = `
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
                <div class="section">
                    <div style="color: gray !important;" class="section-title">Select a slot to see details.</div>
                </div>
                
            </body>
            </html>`;

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
        const jsonFilePath = path.join(this.context.extensionPath, 'out/docs', 'fantom-docs.json');
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

