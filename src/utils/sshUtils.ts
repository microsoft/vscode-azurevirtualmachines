/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import * as fse from 'fs-extra';
import { join } from 'path';
import * as SSHConfig from 'ssh-config';
import { callWithMaskHandling, LocationListStep } from 'vscode-azureextensionui';
import * as which from 'which';
import { IVirtualMachineWizardContext } from '../commands/createVirtualMachine/IVirtualMachineWizardContext';
import { sshFsPath } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';
import { createComputeClient } from './azureClients';
import { cpUtils } from "./cpUtils";
import { nonNullValueAndProp } from './nonNull';

export async function createSshKey(context: IVirtualMachineWizardContext, vmName: string, passphrase: string): Promise<{ sshKeyName: string; keyData: string }> {
    return await callWithMaskHandling(
        async () => {
            let sshKeyName: string = `azure_${vmName}_rsa`;
            let sshKeyPath: string = join(sshFsPath, sshKeyName);
            let keyExists: boolean = await fse.pathExists(`${sshKeyPath}.pub`);

            const maxTime: number = Date.now() + 3000;
            let count: number = 2;
            while (keyExists && Date.now() < maxTime) {
                sshKeyName = `azure_${vmName}_${count}_rsa`;
                sshKeyPath = join(sshFsPath, sshKeyName);
                keyExists = await fse.pathExists(`${sshKeyPath}.pub`);
                count += 1;
            }
            if (!keyExists) {
                const generatingKey: string = localize('generatingKey', 'Generating public/private rsa key pair in "{0}"...', sshKeyPath);
                const generatedKey: string = localize('generatedKey', 'Generated public/private rsa key pair in "{0}".', sshKeyPath);
                ext.outputChannel.appendLog(generatingKey);
                // create the .ssh folder if it doesn't exist
                await fse.ensureDir(sshFsPath);

                if (await sshKeygenExists()) {
                    ext.outputChannel.appendLog(generatingKey);
                    await cpUtils.executeCommand(undefined, undefined, 'ssh-keygen', '-t', 'rsa', '-b', '4096', '-f', cpUtils.wrapArgInQuotes(sshKeyPath), '-N', cpUtils.wrapArgInQuotes(passphrase));
                    ext.outputChannel.appendLog(generatedKey);
                } else {
                    context.telemetry.properties.usedAzureKey = 'true';
                    context.telemetry.properties.hadPassphrase = 'false';
                    ext.outputChannel.appendLog(generatingKey);

                    // if ssh-keygen isn't found, we can leverage Azure's SSH keys, but they do not allow for passphrases
                    if (passphrase) {
                        context.telemetry.properties.hadPassphrase = 'true';
                        ext.outputChannel.appendLog(localize('unableToFindKeygen', 'NOTE: Unable to find `ssh-keygen` in environment variable PATH.  Passphrase will not be respected.', vmName));
                    }

                    const client: ComputeManagementClient = await createComputeClient(context);
                    const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
                    await client.sshPublicKeys.create(rgName, vmName, { location: (await LocationListStep.getLocation(context)).name });

                    const keyPair: ComputeManagementModels.SshPublicKeyGenerateKeyPairResult = await client.sshPublicKeys.generateKeyPair(rgName, vmName);
                    await fse.writeFile(`${sshKeyPath}.pub`, keyPair.publicKey);
                    await fse.writeFile(sshKeyPath, keyPair.privateKey);

                    // delete because there's no purpose once we locally download the key pair
                    await client.sshPublicKeys.deleteMethod(rgName, vmName);
                    ext.outputChannel.appendLog(generatedKey);
                }
            }

            // if we couldn't generate a unique key in 3 seconds, just use an existing key. This should be rare
            return { sshKeyName, keyData: (await fse.readFile(`${sshKeyPath}.pub`)).toString() };
        },
        passphrase);
}

export async function configureSshConfig(vmti: VirtualMachineTreeItem, sshKeyPath: string): Promise<void> {
    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.ensureFile(sshConfigPath);

    // If we find duplicate Hosts, we can just make a new entry called Host (2)...(3)...etc
    const hostName: string = await vmti.getIpAddress();
    let host: string = vmti.name;

    const configFile: string = (await fse.readFile(sshConfigPath)).toString();
    const sshConfig: SSHConfig.Configuration = SSHConfig.parse(configFile);
    // if the host can't be computed, it returns an empty {}
    const hostEntry: SSHConfig.ResolvedConfiguration = sshConfig.compute(host);

    if (hostEntry.Host) {
        let count: number = 2;

        // increment until host doesn't already exist
        while (!!sshConfig.compute(`${vmti.name}-${count}`).Host && count < 100) {
            count = count + 1;
        }

        host = `${vmti.name}-${count}`;
    }

    sshConfig.append({
        Host: host,
        HostName: hostName,
        User: vmti.getUser(),
        IdentityFile: sshKeyPath
    });

    await fse.writeFile(sshConfigPath, sshConfig.toString());
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
