// Map of token types with their identifiers, reusable across features
export const tokenTypes = {
    class: 'class',
    method: 'method',
    field: 'field',
    keyword: 'keyword',
    variable: 'variable',
    string: 'string'
};

// Token legend for semantic tokens (based on the values in `tokenTypes`)
export const tokenLegend = {
    tokenTypes: [tokenTypes.class, tokenTypes.method, tokenTypes.field, tokenTypes.keyword, tokenTypes.variable, tokenTypes.string],
    tokenModifiers: []
};

// Regular expressions for Fantom syntax elements, reusable across features
export const fantomTokenRegex = {
    classPattern: /class\s+(\w+)/g,            // Matches class declarations
    methodPattern: /(?:\b(?:override|static|virtual|abstract|final)\b\s+)*(\w+)\s+(\w+)\s*\([^)]*\)\s*\{/g,  // Matches method declarations
    variablePattern:  /\b(\w+)\b(?=\s*:=)/g,       // Matches variable declarations
    fieldPattern: /^\s*(\w+)\s+(\w+)\s*:=/gm,
};
