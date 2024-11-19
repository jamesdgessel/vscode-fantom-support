import * as vscode from 'vscode';

export class FantomDocsProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true
    };

    // Set default HTML content
    webviewView.webview.html = this.getHtmlContent('Welcome to the Fantom Docs Sidebar!');
  }

  getHtmlContent(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fantom Docs</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 10px;
          }
          h1 {
            color: #007acc;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
  }

  updateContent(content: string) {
    if (this._view) {
      this._view.webview.html = this.getHtmlContent(content);
    }
  }
}
