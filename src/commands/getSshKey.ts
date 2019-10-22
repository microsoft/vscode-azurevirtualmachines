/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as os from "os";
import { Terminal, window } from "vscode";
import { IParsedError, parseError } from "vscode-azureextensionui";
import { cpUtils } from "../utils/cpUtils";
import { delay } from "../utils/delay";

export async function getSshKey(): Promise<string> {
    try {
        return await cpUtils.executeCommand(undefined, undefined, 'cat ~/.ssh/id_rsa.pub');
    } catch (error) {
        const pError: IParsedError = parseError(error);
        if (pError.message.includes('No such file or directory')) {
            const sshKeygenTerminal: string = 'ssh-keygen';
            const sshKeygenCmd: string = 'ssh-keygen -t rsa -b 2048';
            // tslint:disable-next-line: strict-boolean-expressions
            const terminal: Terminal = window.terminals.find((activeTerminal: Terminal) => { return activeTerminal.name === sshKeygenTerminal; }) || window.createTerminal(sshKeygenTerminal);
            terminal.sendText(sshKeygenCmd, true);
            await delay(1000);
            // Enter file in which to save the key
            terminal.sendText(os.EOL, true);
            await delay(1000);
            //Enter passphrase (empty for no passphrase):
            terminal.sendText(os.EOL, true);
            await delay(1000);
            // Enter same passphrase again:
            terminal.sendText(os.EOL, true);

            return await cpUtils.executeCommand(undefined, undefined, 'cat ~/.ssh/id_rsa.pub');
        }

        throw error;
    }
}
