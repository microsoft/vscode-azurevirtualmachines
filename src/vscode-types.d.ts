/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'vscode' {
    // Temporary declaration for compatibility with newer vscode-azext-utils
    // This interface may be added in future VS Code versions
    interface AuthenticationSessionRequest {
        scopes: string[];
        silent?: boolean;
    }
}

export {};