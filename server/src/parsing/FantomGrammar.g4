// FantomGrammar.g4
grammar FantomGrammar;

// ----------------------------
// Parser Rules
// ----------------------------

program
    : doc? usingStmt* typeDef* EOF
    ;

usingStmt
    : usingPodStmt
    | usingTypeStmt
    | usingAsStmt
    ;

usingPodStmt
    : USING podSpec eos 
    ;

usingTypeStmt
    : USING podSpec DOUBLE_COLON ID eos
    ;

usingAsStmt
    : USING podSpec DOUBLE_COLON ID AS ID eos
    ;

podSpec
    : ID
    | STRING
    | ffiPodSpec
    ;

ffiPodSpec
    : LBRACK ID RBRACK ID (DOT ID)*
    ;

typeDef
    : classDef
    | mixinDef
    | facetDef
    | enumDef
    ;

classDef
    : typeHeader CLASS ID inheritance? LBRACE slotDefs? RBRACE
    ;

mixinDef
    : typeHeader MIXIN ID inheritance? LBRACE slotDefs? RBRACE
    ;

facetDef
    : typeHeader FACET CLASS ID inheritance? LBRACE slotDefs? RBRACE
    ;

enumDef
    : typeHeader ENUM CLASS ID inheritance? LBRACE enumValDefs slotDefs? RBRACE
    ;

typeHeader
    : doc? facets? typeFlags?
    ;

typeFlags
    : typeFlag*
    ;

typeFlag
    : ABSTRACT
    | FINAL
    | CONST
    | NATIVE
    ;

inheritance
    : COLON typeList
    ;

enumValDefs
    : enumValDef (COMMA enumValDef)* eos
    ;

enumValDef
    : facets? ID (LPAREN args RPAREN)?
    ;

slotDefs
    : slotDef*
    ;

slotDef
    : fieldDef
    | methodDef
    | ctorDef
    | staticInit
    ;

fieldDef
    : facets? fieldFlags? type ID (ASSIGN expr)? (LBRACE fieldAccessor* RBRACE)? eos
    ;

fieldFlags
    : fieldFlag*
    ;

fieldFlag
    : ABSTRACT
    | CONST
    | FINAL
    | NATIVE
    | OVERRIDE
    | READONLY
    | STATIC
    | VIRTUAL
    ;

fieldAccessor
    : fieldGetter
    | fieldSetter
    ;

fieldGetter
    : GET (eos | block)
    ;

fieldSetter
    : SET (eos | block)
    ;

methodDef
    : facets? methodFlags? type ID LPAREN params? RPAREN methodBody
    ;

methodFlags
    : methodFlag*
    ;

methodFlag
    : ABSTRACT
    | NATIVE
    | ONCE
    | OVERRIDE
    | STATIC
    | VIRTUAL
    | FINAL
    ;

params
    : param (COMMA param)*
    ;

param
    : type ID (ASSIGN expr)?
    ;

methodBody
    : eos
    | block
    ;

ctorDef
    : facets? ctorFlags? NEW ID LPAREN params? RPAREN ctorChain? methodBody
    ;

ctorFlags
    : 
    ;

ctorChain
    : COLON (ctorChainThis | ctorChainSuper)
    ;

ctorChainThis
    : THIS DOT ID LPAREN args RPAREN
    ;

ctorChainSuper
    : SUPER (DOT ID)? LPAREN args RPAREN
    ;

staticInit
    : STATIC block
    ;

facets
    : facet*
    ;

facet
    : AT simpleType facetVals?
    ;

facetVals
    : LBRACE facetVal (eos facetVal)* RBRACE
    ;

facetVal
    : ID ASSIGN expr
    ;

block
    : LBRACE stmt* RBRACE
    ;

stmt
    : breakStmt
    | continueStmt
    | forStmt
    | ifStmt
    | returnStmt
    | switchStmt
    | throwStmt
    | whileStmt
    | tryStmt
    | exprStmt
    | localDef
    ;

breakStmt
    : BREAK eos
    ;

continueStmt
    : CONTINUE eos
    ;

forStmt
    : FOR LPAREN forInit? SEMI expr? SEMI expr? RPAREN block
    ;

forInit
    : expr
    | localDef
    ;

ifStmt
    : IF LPAREN expr RPAREN block (ELSE block)?
    ;

returnStmt
    : RETURN expr? eos
    ;

throwStmt
    : THROW expr eos
    ;

whileStmt
    : WHILE LPAREN expr RPAREN block
    ;

exprStmt
    : expr eos
    ;

localDef
    : type? ID (ASSIGN expr)? eos
    ;

tryStmt
    : TRY block catchStmt* finallyBlock?
    ;

catchStmt
    : CATCH LPAREN type ID RPAREN block
    ;

finallyBlock
    : FINALLY block
    ;

switchStmt
    : SWITCH LPAREN expr RPAREN LBRACE switchCase* defaultStmt? RBRACE
    ;

switchCase
    : CASE expr COLON stmt*
    ;

defaultStmt
    : DEFAULT COLON stmt*
    ;

expr
    : assignExpr
    ;

assignExpr
    : ifExpr (assignOp assignExpr)?
    ;

assignOp
    : ASSIGN
    | MUL_ASSIGN
    | DIV_ASSIGN
    | MOD_ASSIGN
    | ADD_ASSIGN
    | SUB_ASSIGN
    ;

ifExpr
    : ternaryExpr
    | elvisExpr
    ;

ternaryExpr
    : condOrExpr QUESTION ifExprBody COLON ifExprBody
    ;

elvisExpr
    : condOrExpr ELVIS ifExprBody
    ;

ifExprBody
    : condOrExpr
    | THROW expr
    ;

condOrExpr
    : condAndExpr (OR_OR condAndExpr)*
    ;

condAndExpr
    : equalityExpr (AND_AND equalityExpr)*
    ;

equalityExpr
    : relationalExpr ((EQUAL | NOT_EQUAL | STRICT_EQUAL | STRICT_NOT_EQUAL) relationalExpr)?
    ;

relationalExpr
    : typeCheckExpr ((LT | LTE | GT | GTE | SPACESHIP) typeCheckExpr)?
    ;

typeCheckExpr
    : rangeExpr ((IS | AS | ISNOT) type)?
    ;

rangeExpr
    : addExpr ((RANGE_INCLUSIVE | RANGE_EXCLUSIVE) addExpr)*
    ;

addExpr
    : multExpr ((ADD | SUB) multExpr)*
    ;

multExpr
    : unaryExpr ((MUL | DIV | MOD) unaryExpr)*
    ;

unaryExpr
    : (SUB | NOT) unaryExpr
    | parenExpr
    ;

parenExpr
    : LPAREN expr RPAREN
    | termExpr
    ;

termExpr
    : literal
    | ID
    | methodCall
    | fieldAccess
    ;

methodCall
    : ID LPAREN args? RPAREN
    ;

fieldAccess
    : ID (DOT ID)*
    ;

args
    : expr (COMMA expr)*
    ;

type
    : simpleType
        ( QUESTION
        | LBRACK RBRACK
        | LBRACK simpleType COLON simpleType RBRACK
        | LPAREN typeList? RPAREN ARROW simpleType
        )*
    ;

nullType
    : nonNullType QUESTION
    ;

nonNullType
    : simpleType
    | listType
    | mapType
    | funcType
    ;

typeList
    : type (COMMA type)*
    ;

simpleType
    : ID (DOUBLE_COLON ID)?
    ;

listType
    : type LBRACK RBRACK
    ;

mapType
    : LBRACK? type COLON type RBRACK
    ;

funcType
    : LPAREN typeList? RPAREN ARROW type
    ;

literal
    : NULL
    | TRUE
    | FALSE
    | STRING
    | NUMBER
    ;

eos
    : SEMI
    | RBRACE
    ;
    
doc
    : DOC
    ;


// ----------------------------
// Lexer Rules
// ----------------------------

// Keywords
USING      : 'using';
CLASS      : 'class';
MIXIN      : 'mixin';
FACET      : 'facet';
ENUM       : 'enum';
PUBLIC     : 'public';
PROTECTED  : 'protected';
PRIVATE    : 'private';
INTERNAL   : 'internal';
ABSTRACT   : 'abstract';
FINAL      : 'final';
CONST      : 'const';
NATIVE     : 'native';
OVERRIDE   : 'override';
READONLY   : 'readonly';
STATIC     : 'static';
VIRTUAL    : 'virtual';
NEW        : 'new';
THIS       : 'this';
SUPER      : 'super';
BREAK      : 'break';
CONTINUE   : 'continue';
FOR        : 'for';
IF         : 'if';
ELSE       : 'else';
RETURN     : 'return';
THROW      : 'throw';
WHILE      : 'while';
TRY        : 'try';
CATCH      : 'catch';
FINALLY    : 'finally';
SWITCH     : 'switch';
CASE       : 'case';
DEFAULT    : 'default';
IS         : 'is';
AS         : 'as';
ISNOT      : 'isnot';
NULL       : 'null';
TRUE       : 'true';
FALSE      : 'false';
GET        : 'get';
SET        : 'set';
ONCE       : 'once';

// Operators and Punctuation
DOUBLE_COLON : '::';
ELVIS        : '?:';
RANGE_INCLUSIVE : '..';
RANGE_EXCLUSIVE : '..<';
EQUAL        : '==';
NOT_EQUAL    : '!=';
STRICT_EQUAL : '===';
STRICT_NOT_EQUAL : '!==';
LT           : '<';
LTE          : '<=';
GT           : '>';
GTE          : '>=';
SPACESHIP    : '<=>';
OR_OR        : '||';
AND_AND      : '&&';
ASSIGN       : '=';
MUL_ASSIGN   : '*=';
DIV_ASSIGN   : '/=';
MOD_ASSIGN   : '%=';
ADD_ASSIGN   : '+=';
SUB_ASSIGN   : '-=';
ADD          : '+';
SUB          : '-';
MUL          : '*';
DIV          : '/';
MOD          : '%';
NOT          : '!';
QUESTION     : '?';
COLON        : ':';
SEMI         : ';';
COMMA        : ',';
DOT          : '.';
ARROW        : '->';
AT           : '@';
LBRACE       : '{';
RBRACE       : '}';
LPAREN       : '(';
RPAREN       : ')';
LBRACK       : '[';
RBRACK       : ']';

// Identifiers and Literals
ID
    : [a-zA-Z_][a-zA-Z0-9_]*
    ;

STRING
    : '"' (~["\\] | '\\' .)* '"'
    ;

NUMBER
    : [0-9]+ ('.' [0-9]+)?
    ;

// Documentation Comments
DOC
    : '/**' .*? '*/' -> channel(HIDDEN)
    ;

// Whitespace and Comments
WS
    : [ \t\r\n]+ -> skip
    ;

COMMENT
    : '//' ~[\r\n]* -> skip
    ;
