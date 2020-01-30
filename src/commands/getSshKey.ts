/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as os from "os";
import { join } from 'path';
import { IParsedError, parseError } from "vscode-azureextensionui";
import { cpUtils } from "../utils/cpUtils";

export async function getSshKey(vmName: string): Promise<string> {
    const sshKeyName: string = `Azure_${vmName}_rsa`;
    const sshKeyPath: string = join(os.homedir(), '.ssh', sshKeyName);
    const doesntExistError: string = 'No such file or directory';

    try {
        return await cpUtils.executeCommand(undefined, undefined, `cat ${sshKeyPath}.pub`);
    } catch (error) {
        const pError: IParsedError = parseError(error);
        // if the SSH key doesn't exist, create it
        if (pError.message.includes(doesntExistError)) {
            const sshKeygenCmd: string = `ssh-keygen -t rsa -b 2048 -f ${sshKeyPath} -N ""`;
            await cpUtils.executeCommand(undefined, undefined, sshKeygenCmd);
            return await cpUtils.executeCommand(undefined, undefined, `cat ${sshKeyPath}.pub`);
        }

        throw error;
    }
}
