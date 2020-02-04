/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from "os";
import { join } from 'path';
import { IParsedError, parseError } from "vscode-azureextensionui";
import { ext } from '../extensionVariables';
import { VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';
import { cpUtils } from "./cpUtils";

const sshFsPath: string = join(os.homedir(), '.ssh');

export async function getSshKey(vmName: string): Promise<string> {
    const sshKeyName: string = `azure_${vmName}_rsa`;
    const sshKeyPath: string = join(sshFsPath, sshKeyName);
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

export async function configureSshConfig(vmti: VirtualMachineTreeItem): Promise<void> {
    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.ensureFile(sshConfigPath);
    let configFile: string = (await fse.readFile(sshConfigPath)).toString();

    // look to see if the hostname already exists (the same ip address)

    // HostName is the only thing that's unique so if we find a copy, prompt the user to use that profile instead
    // If we find duplicate Hosts, we can just make a new entry called Host (2)...(3)...etc

    const hostName: string = await vmti.getHostName();
    let host: string = vmti.name;

    if (configFile.includes(`HostName ${hostName}`)) {
        // tslint:disable-next-line: no-floating-promises
        ext.ui.showWarningMessage(`HostName "${hostName}" already exists. Use that profile to connect via SSH.`);
        return;
    } else if (configFile.includes(`Host ${vmti.name}`)) {
        // tslint:disable-next-line: no-floating-promises
        ext.ui.showWarningMessage(`Host "${host}" already exists in SSH config.  Creating a copy of the host.`);
        let count: number = 2;

        // increment until host doesn't already exist
        while (configFile.includes(`Host ${vmti.name}-${count}`)) {
            count = count + 1;
        }

        host = `${vmti.name}-${count}`;
    }

    const sshKeyName: string = `azure_${vmti.name}_rsa`;
    const sshKeyPath: string = join('~', '.ssh', sshKeyName);

    configFile = configFile +
        `\nHost ${host}
             HostName ${hostName}
             User ${vmti.getUser()}
             IdentityFile ${sshKeyPath}`;

    await fse.writeFile(sshConfigPath, configFile);
}
