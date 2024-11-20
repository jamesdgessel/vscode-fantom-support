// src/fantomDocsProvider.ts

import * as vscode from 'vscode';

// Constants
const LANGUAGE_SERVER_ID = 'fantomLanguageServer';

let debug = false; // Initialize debug flag

// Update debug flag when configuration changes
vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(LANGUAGE_SERVER_ID)) {
        const fantomConfig = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
        debug = fantomConfig.get<boolean>('enableLogging', false);
    }
});

/**
 * Enum representing the types of items in the Fantom Docs tree.
 */
enum FantomDocType {
    Pod = 'Pod',
    Class = 'Class',
    Slot = 'Slot',
}

/**
 * Represents a single item in the Fantom Docs tree.
 */
class FantomDocItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: FantomDocType,
        public readonly documentation: string
    ) {
        super(label, collapsibleState);

        this.iconPath = this.getIconPath(type);
        this.tooltip = this.label;
        this.description = type;

        // Fix the command structure
        this.command = {
            command: 'fantomDocs.showDetails',
            title: 'Show Details',
            arguments: [
                {
                    label: this.label,
                    type: this.type,
                    documentation: this.documentation || 'No documentation available', // Ensure documentation is never undefined
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
            case FantomDocType.Slot:
                return new vscode.ThemeIcon('symbol-method');
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
        classes: {
            name: string;
            slots: { name: string; documentation: string }[];
        }[];
    }[] = [];

    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;

        // Read initial debug configuration
        const fantomConfig = vscode.workspace.getConfiguration(LANGUAGE_SERVER_ID);
        debug = fantomConfig.get<boolean>('enableLogging', false);
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

    /**
     * Sets the pods data.
     * @param pods The list of pods to display.
     */
    setPods(
        pods: {
            name: string;
            classes: {
                name: string;
                slots: { name: string; documentation: string }[];
            }[];
        }[]
    ) {
        this.logDebug('Setting pods data');
        this.pods = pods;
        this.refresh();
    }

    getTreeItem(element: FantomDocItem): vscode.TreeItem {
        this.logDebug(`Getting tree item for: ${element.label}`);
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
                            `Documentation for Pod: ${pod.name}`
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
                                `Documentation for Class: ${cls.name}`
                            )
                    )
                );
            case FantomDocType.Class:
                // Children: Slots (methods/fields)
                const slots =
                    this.pods
                        .flatMap((pod) => pod.classes)
                        .find((cls) => cls.name === element.label)?.slots || [];
                return Promise.resolve(
                    slots.map(
                        (slot) =>
                            new FantomDocItem(
                                slot.name,
                                vscode.TreeItemCollapsibleState.None,
                                FantomDocType.Slot,
                                slot.documentation
                            )
                    )
                );
            case FantomDocType.Slot:
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
        webviewView.webview.html = this.getHtmlContent('Select a slot to see details.');
    }

    /**
     * Update the webview content with the selected item's details.
     */
    showSlotDetails(label: string, documentation: string) {
        this.logDebug(`Showing details for: ${label}`);

        if (this._view) {
            this._view.show?.(true); // Bring the view into focus
            this._view.webview.html = this.getHtmlContent(
                `<h1>${label}</h1>
                <p><strong>Documentation:</strong></p>
                <p>${documentation}</p>`
            );
        } else {
            this.logDebug('Webview is not available');
        }
    }

    /**
     * Generate HTML content for the webview.
     */
    private getHtmlContent(content: string): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Slot Details</title>
            </head>
            <body>
                ${content}
            </body>
            </html>`;
    }
}
