// src/fantomDocsProvider.ts

import * as vscode from 'vscode';

const debug = true; // Define debug constant

/**
 * Enum representing the types of items in the Fantom Docs tree.
 */
enum FantomDocType {
    Pod = 'Pod',
    Class = 'Class',
    Slot = 'Slot'
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

        if (debug) {
            console.debug(`Creating FantomDocItem: ${label}, type: ${type}`);
        }

        switch (type) {
            case FantomDocType.Pod:
                this.iconPath = new vscode.ThemeIcon('package');
                break;
            case FantomDocType.Class:
                this.iconPath = new vscode.ThemeIcon('symbol-class');
                break;
            case FantomDocType.Slot:
                this.iconPath = new vscode.ThemeIcon('symbol-method');
                break;
        }

        this.tooltip = `${this.label}`;
        this.description = type;

        // Set the documentation to be displayed when hovering
        this.documentation = documentation;
    }
}

/**
 * Provides data for the Fantom Docs tree view.
 */
export class FantomDocsProvider implements vscode.TreeDataProvider<FantomDocItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FantomDocItem | undefined | void> = new vscode.EventEmitter<FantomDocItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FantomDocItem | undefined | void> = this._onDidChangeTreeData.event;

    private pods: { name: string; classes: { name: string; slots: { name: string; documentation: string }[] }[] }[] = [];

    /**
     * Refreshes the tree view.
     */
    refresh(): void {
        if (debug) {
            console.debug('Refreshing FantomDocsProvider tree view');
        }
        this._onDidChangeTreeData.fire();
    }

    /**
     * Sets the pods data.
     * @param pods The list of pods to display.
     */
    setPods(pods: { name: string; classes: { name: string; slots: { name: string; documentation: string }[] }[] }[]) {
        if (debug) {
            console.debug('Setting pods data', pods);
        }
        this.pods = pods;
        this.refresh();
    }

    getTreeItem(element: FantomDocItem): vscode.TreeItem {
        if (debug) {
            console.debug('Getting tree item', element);
        }
        return element;
    }

    getChildren(element?: FantomDocItem): Thenable<FantomDocItem[]> {
        if (debug) {
            console.debug('Getting children for element', element);
        }

        if (!element) {
            // Root elements: Pods
            return Promise.resolve(this.pods.map(pod => new FantomDocItem(
                pod.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                FantomDocType.Pod,
                `Documentation for Pod: ${pod.name}`
            )));
        }

        switch (element.type) {
            case FantomDocType.Pod:
                // Children: Classes
                const classes = this.pods.find(p => p.name === element.label)?.classes || [];
                return Promise.resolve(classes.map(cls => new FantomDocItem(
                    cls.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    FantomDocType.Class,
                    `Documentation for Class: ${cls.name}`
                )));
            case FantomDocType.Class:
                // Children: Slots (methods/fields)
                const slots = this.pods.flatMap(pod => pod.classes)
                    .find(cls => cls.name === element.label)?.slots || [];
                return Promise.resolve(slots.map(slot => new FantomDocItem(
                    slot.name,
                    vscode.TreeItemCollapsibleState.None,
                    FantomDocType.Slot,
                    slot.documentation
                )));
            case FantomDocType.Slot:
                // No children
                return Promise.resolve([]);
            default:
                return Promise.resolve([]);
        }
    }
}
