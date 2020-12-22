/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import * as fse from 'fs-extra';
import * as os from "os";
import { join } from 'path';
import { callWithMaskHandling } from 'vscode-azureextensionui';
import * as which from 'which';
import { IVirtualMachineWizardContext } from '../commands/createVirtualMachine/IVirtualMachineWizardContext';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';
import { createComputeClient } from './azureClients';
import { cpUtils } from "./cpUtils";
import { nonNullValueAndProp } from './nonNull';

export const sshFsPath: string = join(os.homedir(), '.ssh');

export async function getSshKey(context: IVirtualMachineWizardContext, vmName: string, passphrase: string): Promise<string> {
    return await callWithMaskHandling(
        async () => {
            const sshKeyName: string = `azure_${vmName}_rsa`;
            const sshKeyPath: string = join(sshFsPath, sshKeyName);

            if (!await fse.pathExists(`${sshKeyPath}.pub`)) {
                const generatingKey: string = localize('generatingKey', 'Generating public/private rsa key pair in "{0}"...', sshKeyPath);
                const generatedKey: string = localize('generatedKey', 'Generated public/private rsa key pair in "{0}".', sshKeyPath);
                // create the .ssh folder if it doesn't exist
                await fse.ensureDir(sshFsPath);
                if (await sshKeygenExists()) {
                    ext.outputChannel.appendLog(generatingKey);
                    await cpUtils.executeCommand(undefined, undefined, 'ssh-keygen', '-t', 'rsa', '-b', '4096', '-f', cpUtils.wrapArgInQuotes(sshKeyPath), '-N', cpUtils.wrapArgInQuotes(passphrase));
                    ext.outputChannel.appendLog(generatedKey);
                } else {
                    // if ssh-keygen isn't found, we can leverage Azure's SSH keys, but they do not allow for passphrases
                    ext.outputChannel.appendLog(localize('creatingAzureKey', 'Unable to find `ssh-keygen` in environment variable PATH.  Creating new Azure SSH Key "{0}"...', vmName));
                    if (passphrase) {
                        ext.outputChannel.appendLog(localize('generatingKeyFailedNote', 'NOTE: Azure generated SSH keys do not support passphrases.'));
                    }

                    const client: ComputeManagementClient = await createComputeClient(context);
                    const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
                    await client.sshPublicKeys.create(rgName, vmName, { location: nonNullValueAndProp(context.location, 'name') });
                    ext.outputChannel.appendLog(localize('createdAzureKey', 'Created new Azure SSH Key "{0}".', vmName));

                    ext.outputChannel.appendLog(generatingKey);
                    const keyPair: ComputeManagementModels.SshPublicKeyGenerateKeyPairResult = await client.sshPublicKeys.generateKeyPair(rgName, vmName);
                    await fse.writeFile(`${sshKeyPath}.pub`, keyPair.publicKey);
                    await fse.writeFile(sshKeyPath, keyPair.privateKey);
                    ext.outputChannel.appendLog(generatedKey);
                }
            }

            return (await fse.readFile(`${sshKeyPath}.pub`)).toString();
        },
        passphrase);
}

export async function configureSshConfig(vmti: VirtualMachineTreeItem, sshKeyPath?: string): Promise<void> {
    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.ensureFile(sshConfigPath);
    let configFile: string = (await fse.readFile(sshConfigPath)).toString();

    // If we find duplicate Hosts, we can just make a new entry called Host (2)...(3)...etc
    const hostName: string = await vmti.getIpAddress();
    let host: string = vmti.name;

    if (configFile.includes(`Host ${vmti.name}`)) {
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

    await fse.writeFile(sshConfigPath, configFile);
    ext.outputChannel.appendLog(localize('addingEntry', `Added new entry to "{0}" with Host "{1}".`, sshConfigPath, host));
}

async function sshKeygenExists(): Promise<boolean> {
    try {
        // throws an error if it can't find cmd in PATH env
        await which('ssh-keygen');
    } catch (err) {
        return false;
    }

    return true;
}
