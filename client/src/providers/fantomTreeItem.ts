import * as vscode from 'vscode';
import { FantomDocType } from './fantomDocsStructure';
import { podGroup } from './fantomDocsStructure';

let favPods: string[] = vscode.workspace.getConfiguration('fantomLanguageServer').fantomDocs.favPods || ['sys'];

export class BaseItem extends vscode.TreeItem {

  public static favIcon = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));

  public isFav: boolean = false

  constructor(
    public readonly label: string,
    public readonly type: FantomDocType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);

    // Handle favorites 
    if (favPods.includes(label)) { 
      console.log("found fav " + label);
      this.isFav = true 
      this.iconPath = BaseItem.favIcon 
    } 
  }

  addKeysToTooltip(data: object) { this.tooltip = `Available keys: ${Object.keys(data).join(', ')}`; }
  printObjToTooltip(data: object) { this.tooltip = JSON.stringify(data, null, 2); }

}


/**
* Represents a single item in the Fantom Docs tree.
*/
export class GroupItem extends BaseItem {

  static defaultIcon = new vscode.ThemeIcon('symbol-folder');

  constructor(
      public readonly label: string,
      public readonly type: FantomDocType,
  ) {
      super(label, type, vscode.TreeItemCollapsibleState.Collapsed);
      this.iconPath = GroupItem.defaultIcon;
    }
}

/**
* Represents a single item in the Fantom Docs tree.
*/
export class PodItem extends BaseItem {

  static defaultIcon = new vscode.ThemeIcon('package');

  constructor(
      public readonly label: string,
      public readonly type: FantomDocType,
      public readonly data: { classes: any[] },
  ) {
      super(label, type, vscode.TreeItemCollapsibleState.Collapsed);

      if (!this.isFav) { this.iconPath = PodItem.defaultIcon; }

    }
}

/**
* Represents a single item in the Fantom Docs tree.
*/
export class ClassItem extends BaseItem {

  static defaultIcon = new vscode.ThemeIcon('symbol-class');
  static privateIcon = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('disabledForeground'));
  static mixinIcon = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.blue'));
  static abstractIcon = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('charts.red'));

  constructor(
      public readonly label: string,
      public readonly type: FantomDocType,
      public readonly data: { parent: string, mods: string, qname: string, inherits: string[] }
  ) {
      super(label, type, vscode.TreeItemCollapsibleState.Collapsed);
      if (!this.isFav) { this.iconPath = ClassItem.defaultIcon; }
      this.tooltip = data.inherits.reverse().join(' -> ');
      this.description = data.parent.split("::")[1] === "Obj" ? "" : data.parent.split("::")[1];

      // Handle class types 
      if (data.mods && data.mods.includes('private')) { 
        this.iconPath = ClassItem.privateIcon; 
        this.description += ' -private-'; 
      } else if (data.mods && data.mods.includes('mixin')) { 
        this.iconPath = ClassItem.mixinIcon; 
        this.description += ' -mixin-'; 
      } else if (data.mods && data.mods.includes('abstract')) {
        this.iconPath = ClassItem.abstractIcon; 
        this.description += ' -abstract-'; 
      }
  }
}

/**
* Represents a single item in the Fantom Docs tree.
*/
export class MethodItem extends BaseItem {

  static defaultIcon = new vscode.ThemeIcon('symbol-method');
  static privateIcon = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('disabledForeground'));
  static staticIcon = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.green'));
  static virtualIcon = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.blue'));
  static abstractIcon = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.blue'));
  static overrideIcon = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.blue'));
  static makeIcon = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.pink'));

  constructor(
      public readonly label: string,
      public readonly type: FantomDocType,
      public readonly data: { returns: string, mods: string, qname: string},
  ) {
      super(label, type, vscode.TreeItemCollapsibleState.None);
      this.iconPath = MethodItem.defaultIcon;
      this.tooltip = data.qname;
      this.description = data.returns.split('::')[1];

      // Handle class types 
      if (this.label==='make') {
        this.iconPath = MethodItem.makeIcon; 
        this.description += ' -make-'; 
      } else if (data.mods && data.mods.includes('private')) { 
        this.iconPath = MethodItem.privateIcon; 
        this.description += ' -private-'; 
      } else if (data.mods && data.mods.includes('static')) { 
        this.iconPath = MethodItem.staticIcon; 
        this.description += ' -static-'; 
      } else if (data.mods && data.mods.includes('abstract')) {
        this.iconPath = MethodItem.abstractIcon; 
        this.description += ' -abstract-'; 
      } else if (data.mods && data.mods.includes('virtual')) {
        this.iconPath = MethodItem.virtualIcon; 
        this.description += ' -virtual-'; 
      } else if (data.mods && data.mods.includes('once')) {
        this.iconPath = MethodItem.makeIcon; 
        this.description += ' -once-'; 
      } else if (data.mods && data.mods.includes('override')) {
        this.iconPath = MethodItem.overrideIcon; 
        this.description += ' -override-'; 
      }
    }
}

/**
* Represents a single item in the Fantom Docs tree.
*/
export class FieldItem extends BaseItem {

  static defaultIcon = new vscode.ThemeIcon('symbol-field');
  static privateIcon = new vscode.ThemeIcon('symbol-field', new vscode.ThemeColor('disabledForeground'));
  static staticIcon = new vscode.ThemeIcon('symbol-field', new vscode.ThemeColor('charts.green'));
  static virtualIcon = new vscode.ThemeIcon('symbol-field', new vscode.ThemeColor('charts.blue'));
  static abstractIcon = new vscode.ThemeIcon('symbol-field', new vscode.ThemeColor('charts.blue'));
  static overrideIcon = new vscode.ThemeIcon('symbol-field', new vscode.ThemeColor('charts.blue'));
  static makeIcon = new vscode.ThemeIcon('symbol-field', new vscode.ThemeColor('charts.pink'));

  constructor(
    public readonly label: string,
    public readonly type: FantomDocType,
    public readonly data: { mods: string, qname: string},
) {
    super(label, type, vscode.TreeItemCollapsibleState.None);
    this.iconPath = FieldItem.defaultIcon;
    this.tooltip = data.qname;
    this.description = "";

    // Handle class types 
    if (this.label==='make') {
      this.iconPath = FieldItem.makeIcon; 
      this.description += ' -make-'; 
    } else if (data.mods && data.mods.includes('private')) { 
      this.iconPath = FieldItem.privateIcon; 
      this.description += ' -private-'; 
    } else if (data.mods && data.mods.includes('static')) { 
      this.iconPath = FieldItem.staticIcon; 
      this.description += ' -static-'; 
    } else if (data.mods && data.mods.includes('abstract')) {
      this.iconPath = FieldItem.abstractIcon; 
      this.description += ' -abstract-'; 
    } else if (data.mods && data.mods.includes('virtual')) {
      this.iconPath = FieldItem.virtualIcon; 
      this.description += ' -virtual-'; 
    } else if (data.mods && data.mods.includes('once')) {
      this.iconPath = FieldItem.makeIcon; 
      this.description += ' -once-'; 
    } else if (data.mods && data.mods.includes('override')) {
      this.iconPath = FieldItem.overrideIcon; 
      this.description += ' -override-'; 
    }

  }
}

// /**
// * Represents a single item in the Fantom Docs tree.
// */
// export class FantomDocItem extends vscode.TreeItem {

//   parent?: string;
//   qname?: string;

//   group?: string;
//   mods?: string;

//   isFav: boolean = false;
  
//   constructor(
//       public readonly label: string,
//       public readonly type: FantomDocType,
//       public readonly data?: object
//   ) {
//       super(label);

//       console.log("data type is ", typeof data);
//       this.qname = "hello"; //data.qname;
//       this.mods = data?.mods || '';
      
//       this.iconPath = getIconPath(this.type as FantomDocType);
//       this.tooltip = this.qname;

//       // if (this.type === FantomDocType.Method || this.type === FantomDocType.Field) {
//       //     const podName = this.qname.split('::')[0];
//       //     const parentPodName = this.parent?.qname.split('::')[0]; // Assuming parent pod name is part of parent's qname
//       //     if (podName !== parentPodName) {
//       //       this.description = ` <- ${podName}`;
//       //     }
//       //     if (this.data.public === false) {
//       //         this.description = (this.description || '') + ' [private]';
//       //     }
//       // }

//       // if (this.type === FantomDocType.Class) {
//       //     if (this.data.public == false) {
//       //     this.description = 'Private';
//       //     this.iconPath = new vscode.ThemeIcon('symbol-class', new vscode.ThemeColor('disabledForeground'));
//       //     if (this.data.base) {
//       //         this.description += ` (Base: ${this.data.base})`;
//       //     }
//       //     }
//       // }

//       // if (this.type === FantomDocType.Pod) {
//       //     this.group = podGroup(this.label);
//       //     this.description = this.group
//       //     if (favPods.includes(this.label)) {
//       //         this.isFav = true;
//       //         this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
//       //     }
//       // }

//       // // Append mods to description
//       // if (data.mods) {
//       //     this.description = (this.description || '') + ` ${data.mods}`;
//       // }

//       // // Fix the command structure
//       // this.command = {
//       //     command: 'fantomDocs.showdata',
//       //     title: 'Show data',
//       //     arguments: [
//       //         {
//       //             label: this.label,
//       //             type: this.type,
//       //             documentation: this.data.documentation || 'No docs yet...', 
//       //             qname: this.qname,
//       //         },
//       //     ],
//       // };
//     }
  
// }

// export function getIconPath(type: FantomDocType): vscode.ThemeIcon {
//   switch (type) {
//       case FantomDocType.Pod:
//           return new vscode.ThemeIcon('package');
//       case FantomDocType.Class:
//           return new vscode.ThemeIcon('symbol-class');
//       case FantomDocType.Method:
//           return new vscode.ThemeIcon('symbol-method');
//       case FantomDocType.Field:
//           return new vscode.ThemeIcon('symbol-field');
//       case FantomDocType.Group:
//           return new vscode.ThemeIcon('symbol-folder');
//       default:
//           return new vscode.ThemeIcon('question');
//   }
// }