import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const provider = new FantomSymbolProvider();
  const providerRegistration = vscode.languages.registerDocumentSymbolProvider(
    { language: 'fantom' },
    provider
  );
  context.subscriptions.push(providerRegistration);
}

class FantomSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const text = document.getText();
    const symbols: vscode.DocumentSymbol[] = [];

    const classPattern = /class\s+(\w+)/g;
    const methodPattern = /(\w+)\s*\([^)]*\)\s*{/g;
    // const fieldPattern = /^\s*(\w+)\s+(\w+)\s*:=\s*[^;{}]*$/gm;

    let match;
    let currentClassSymbol: vscode.DocumentSymbol | null = null;

    // Match all classes in the document
    while ((match = classPattern.exec(text)) !== null) {
      const className = match[1];
      const classStartPos = document.positionAt(match.index);
      const classEndPos = document.lineAt(classStartPos.line).range.end;

      // Create a new class symbol with "public" detail
      currentClassSymbol = new vscode.DocumentSymbol(
        className,
        'public',  // Detail annotation for public classes
        vscode.SymbolKind.Class,
        new vscode.Range(classStartPos, classEndPos),
        new vscode.Range(classStartPos, classEndPos)
      );
      symbols.push(currentClassSymbol);
    }

    // // Match fields and add them to the current class
    // while ((match = fieldPattern.exec(text)) !== null) {
    //   const fieldName = match[2];
    //   const fieldType = match[1];
    //   const fieldPos = document.positionAt(match.index);

    //   const fieldSymbol = new vscode.DocumentSymbol(
    //     fieldName,
    //     fieldType,
    //     vscode.SymbolKind.Field,
    //     new vscode.Range(fieldPos, fieldPos),
    //     new vscode.Range(fieldPos, fieldPos)
    //   );

    //   // Add field to the current class if it exists, otherwise at root
    //   if (currentClassSymbol) {
    //     currentClassSymbol.children.push(fieldSymbol);
    //   } else {
    //     symbols.push(fieldSymbol);
    //   }
    // }

    // Match methods and add them to the current class
    while ((match = methodPattern.exec(text)) !== null) {
      const methodName = match[1];
      const methodPos = document.positionAt(match.index);

      const methodSymbol = new vscode.DocumentSymbol(
        methodName,
        'Method',
        vscode.SymbolKind.Method,
        new vscode.Range(methodPos, methodPos),
        new vscode.Range(methodPos, methodPos)
      );

      // Add method to the current class if it exists, otherwise at root
      if (currentClassSymbol) {
        currentClassSymbol.children.push(methodSymbol);
      } else {
        symbols.push(methodSymbol);
      }
    }

    return symbols;
  }
}
