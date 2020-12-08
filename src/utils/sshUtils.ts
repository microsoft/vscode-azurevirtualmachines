/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from "os";
import { join } from 'path';
import { callWithMaskHandling } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';
import { cpUtils } from "./cpUtils";

export const sshFsPath: string = join(os.homedir(), '.ssh');

export async function getSshKey(vmName: string, passphrase: string): Promise<string> {
    return await callWithMaskHandling(
        async () => {
            const sshKeyName: string = `azure_${vmName}_rsa`;
            const sshKeyPath: string = join(sshFsPath, sshKeyName);

            if (!await fse.pathExists(`${sshKeyPath}.pub`)) {
                ext.outputChannel.appendLog(localize('generatingKey', 'Generating public/private rsa key pair in "{0}"...', sshKeyPath));
                // create the .ssh folder if it doesn't exist
                await fse.ensureDir(sshFsPath);
                await cpUtils.executeCommand(undefined, undefined, 'ssh-keygen', '-t', 'rsa', '-b', '4096', '-f', cpUtils.wrapArgInQuotes(sshKeyPath), '-N', cpUtils.wrapArgInQuotes(passphrase));
                ext.outputChannel.appendLog(localize('generatedKey', 'Generated public/private rsa key pair in "{0}".', sshKeyPath));
            }

            return (await fse.readFile(`${sshKeyPath}.pub`)).toString();
        },
        passphrase);
}

export async function configureSshConfig(vmti: VirtualMachineTreeItem, sshKeyPath?: string): Promise<void> {
    let configFile: string = await getSshConfigFile();

    // If we find duplicate Hosts, we can just make a new entry called Host (2)...(3)...etc
    const hostName: string = await vmti.getIpAddress();
    let host: string = vmti.name;

    if (doesHostExistInConfig(host, configFile)) {
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
    sshKeyPath = sshKeyPath || `~/.ssh/${sshKeyName}`;
    const fourSpaces: string = '    ';

    configFile = configFile + `${os.EOL}Host ${host}${os.EOL}${fourSpaces}HostName ${hostName}${os.EOL}${fourSpaces}User ${vmti.getUser()}${os.EOL}${fourSpaces}IdentityFile ${sshKeyPath}`;

    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.writeFile(sshConfigPath, configFile);
    ext.outputChannel.appendLog(localize('addingEntry', `Added new entry to "{0}" with Host "{1}".`, sshConfigPath, host));
}

export function doesHostExistInConfig(host: string, configFile: string): boolean {
    const linesInConfig: string[] = configFile.split(/\r?\n/);
    const hostStr: string = `Host ${host}`;
    return linesInConfig.includes(hostStr);
}

export async function getSshConfigFile(): Promise<string> {
    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.ensureFile(sshConfigPath);
    return (await fse.readFile(sshConfigPath)).toString();
}
