import * as vscode from 'vscode';
import { FantomDocType } from './fantomDocsStructure';
import { podGroup } from './fantomDocsStructure';

let favPods: string[] = vscode.workspace.getConfiguration('fantomLanguageServer').fantomDocs.favPods || ['sys'];

export class BaseItem extends vscode.TreeItem {

  public icon = 'question';
  public color = '';
  public iconPath: vscode.ThemeIcon = new vscode.ThemeIcon(this.icon);

  public qname: string = '';
  public type: FantomDocType = FantomDocType.Group;


  //icons 
  public static podIcon = 'package';
  public static methodIcon = 'symbol-method';
  public static fieldIcon = 'symbol-field';
  public static classIcon = 'symbol-class';
  public static enumIcon = 'symbol-enum';
  public static groupIcon = 'symbol-folder';
  public static favIcon = 'star-full';
  public static mixinIcon = 'symbol-object';

  //color keys 
  public static fadedColor = 'disabledForeground';
  public static green = 'charts.green';
  public static blue = 'charts.blue';
  public static red = 'charts.red';
  public static pink = 'charts.pink';
  public static yellow = 'charts.yellow';

  //modifier colors 
  public static constructorColor = 'charts.pink';
  public static privateColor = 'charts.pink';
  public static staticColor = 'charts.green';
  public static virtualColor = 'charts.blue';
  public static abstractColor = 'charts.blue';
  public static mixinColor = 'charts.blue';
  public static overrideColor = 'charts.blue';
  public static enumColor = 'charts.green';

  public makeIcon() { 
    if      (this.isFav)      {this.iconPath = new vscode.ThemeIcon(BaseItem.favIcon, new vscode.ThemeColor(BaseItem.yellow)); }
    else if (this.color!=='') {this.iconPath = new vscode.ThemeIcon(this.icon, new vscode.ThemeColor(this.color)); }
    else                      {this.iconPath = new vscode.ThemeIcon(this.icon); }
  }

  public addQname(qname: string) { this.qname = qname; }

  public regCmd(qname: string) {
    this.command = {
      command: 'fantomDocs.showDetails',
      title: 'Show data',
      arguments: [
          {
              label: this.label,
              type: this.type,
              qname: qname,
          },
      ],
    };
  }

  public isFav: boolean = false

  constructor(
    public readonly label: string,
    public readonly tyype: FantomDocType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
    this.type = tyype;
    
    // Handle favorites 
    if (favPods.includes(label)) { this.isFav = true } 

  }

  printKeysToTooltip(data: object) { this.tooltip = `Available keys: ${Object.keys(data).join(', ')}`; }
  printObjToTooltip(data: object) { this.tooltip = JSON.stringify(data, null, 2); }

}


/**
* Represents a single item in the Fantom Docs tree.
*/
export class GroupItem extends BaseItem {

  override icon = BaseItem.groupIcon;

  constructor(
      public readonly label: string,
      public readonly type: FantomDocType,
  ) {
      super(label, type, vscode.TreeItemCollapsibleState.Collapsed);
      this.makeIcon();
    }
}

/**
* Represents a single item in the Fantom Docs tree.
*/
export class PodItem extends BaseItem {

  override icon = BaseItem.podIcon;

  constructor(
      public readonly label: string,
      public readonly type: FantomDocType,
      public readonly data: { qname:string, classes: any[] },
  ) {
      super(label, type, vscode.TreeItemCollapsibleState.Collapsed);
      this.makeIcon();
      this.regCmd(data.qname);
    }
}

/**
* Represents a single item in the Fantom Docs tree.
*/
export class ClassItem extends BaseItem {

  override icon = BaseItem.classIcon;

  constructor(
      public readonly label: string,
      public readonly type: FantomDocType,
      public readonly data: { parent: string, mods: string, qname: string, inherits: string[] }
  ) {
      super(label, type, vscode.TreeItemCollapsibleState.Collapsed);
      this.tooltip = data.mods;
      this.tooltip += "\n"+data.inherits.reverse().join(' -> ');
      this.description = data.parent.split("::")[1] === "Obj" ? "" : data.parent.split("::")[1];

      // Handle class types 
      if      (data.mods && data.mods.includes('private')) { this.color = BaseItem.fadedColor;} 
      else if (data.mods && data.mods.includes('enum')) { this.icon = BaseItem.enumIcon; this.color=BaseItem.enumColor;} 
      else if (data.mods && data.mods.includes('mixin')) { this.icon = BaseItem.mixinIcon; this.color = BaseItem.mixinColor;} 
      else if (data.mods && data.mods.includes('abstract')) {this.color = BaseItem.abstractColor;}

      this.makeIcon();
      this.regCmd(data.qname);
  }
}

/**
* Represents a single item in the Fantom Docs tree.
*/
export class MethodItem extends BaseItem {

  override icon = 'symbol-method';

  constructor(
      public readonly label: string,
      public readonly type: FantomDocType,
      public readonly data: { returns: string, mods: string, qname: string},
  ) {
      super(label, type, vscode.TreeItemCollapsibleState.None);
      this.tooltip = data.mods; 
      this.tooltip += "\n"+data.qname;
      this.description = data.returns.split('::')[1];

      // Handle class types 
      if      (this.label==='make') {this.color = BaseItem.constructorColor;} 
      else if (data.mods && data.mods.includes('private')) {this.color = BaseItem.privateColor;} 
      else if (data.mods && data.mods.includes('once')) {this.color = BaseItem.constructorColor;} 
      else if (data.mods && data.mods.includes('static')) { this.color = BaseItem.staticColor;} 
      else if (data.mods && data.mods.includes('abstract')) {this.color = BaseItem.abstractColor;} 
      else if (data.mods && data.mods.includes('virtual')) {this.color = BaseItem.virtualColor;} 
      else if (data.mods && data.mods.includes('override')) {this.color = BaseItem.overrideColor;}

      this.makeIcon();
      this.regCmd(data.qname);
    }
}

/**
* Represents a single item in the Fantom Docs tree.
*/
export class FieldItem extends BaseItem {

  override icon = 'symbol-field';

  constructor(
    public readonly label: string,
    public readonly type: FantomDocType,
    public readonly data: { mods: string, qname: string, returns: string },
) {
    super(label, type, vscode.TreeItemCollapsibleState.None);
    this.tooltip = data.mods; 
    this.tooltip += "\n"+data.qname;
    
    this.description = data.returns; //.split('::')[1];

    // Handle class types 
    if      (this.label==='make') {this.color = BaseItem.constructorColor; } 
    else if (data.mods && data.mods.includes('private')) {this.color = BaseItem.privateColor;} 
    else if (data.mods && data.mods.includes('once')) {this.color = BaseItem.constructorColor;} 
    else if (data.mods && data.mods.includes('static')) { this.color = BaseItem.staticColor;} 
    else if (data.mods && data.mods.includes('abstract')) {this.color = BaseItem.abstractColor;} 
    else if (data.mods && data.mods.includes('virtual')) {this.color = BaseItem.virtualColor;} 
    else if (data.mods && data.mods.includes('override')) {this.color = BaseItem.overrideColor;}

    this.makeIcon();
    this.regCmd(data.qname);

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