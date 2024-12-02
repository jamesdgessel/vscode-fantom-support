import { Connection, InitializeParams, InitializeResult } from "vscode-languageserver";

export const mockConnection: Connection = {

    sendNotification: () => {},

    onInitialize: (callback: (params: InitializeParams) => InitializeResult) => {
        const params: InitializeParams = {
            processId: null,
            rootPath: null,
            rootUri: null,
            capabilities: {},
            initializationOptions: {"general": {"debug":"verbose"}},
            trace: 'off',
            workspaceFolders: null
        };
        return callback(params);
    },

} as unknown as Connection;
