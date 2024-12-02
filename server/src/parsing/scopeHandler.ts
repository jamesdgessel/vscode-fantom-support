
interface Scope {
    type: 'class' | 'method' | 'block';
    lineStart: number;
}

export class ScopeHandler {
    private scopeStack: Scope[] = [];

    push(scope: Scope) {
        this.scopeStack.push(scope);
    }

    pop() {
        this.scopeStack.pop();
    }

    isInMethodScope(line: number): boolean {
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            const scope = this.scopeStack[i];
            if (scope.type === 'method' && line >= scope.lineStart) {
                return true;
            }
            if (scope.type === 'class') {
                break; // Stop if we reach a class
            }
        }
        return false;
    }
}