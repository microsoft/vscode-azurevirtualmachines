/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import * as fse from 'fs-extra';
import { join } from 'path';
import { Progress } from "vscode";
import { AzureWizardExecuteStep, callWithMaskHandling } from "vscode-azureextensionui";
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { createComputeClient } from '../../../utils/azureClients';
import { cpUtils } from '../../../utils/cpUtils';
import { nonNullProp, nonNullValueAndProp } from '../../../utils/nonNull';
import { sshFsPath } from '../../../utils/sshUtils';
import { IVirtualMachineWizardContext } from '../IVirtualMachineWizardContext';

export class SshKeyCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 259;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const computeClient: ComputeManagementClient = await createComputeClient(context);
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const location: string = nonNullValueAndProp(context.location, 'name');

        const sshKeyName: string = vmName + '_key';
        const creatingSshKey: string = localize('creatingSshKey', `Creating new SSH key "${sshKeyName}"...`);
        progress.report({ message: creatingSshKey });
        ext.outputChannel.appendLog(creatingSshKey);
        let publicKey: string | undefined;

        // Azure doesn't let users generate SSH keys with passphrases, but we can pass the public SSH key as a parameter
        if (context.passphrase) {
            publicKey = await this.getSshKey(vmName, context.passphrase);
        }

        const newSshKey: ComputeManagementModels.SshPublicKeyResource = await computeClient.sshPublicKeys.create(rgName, sshKeyName, { publicKey, location });
        // only need to generate the key pair if the user didn't have a passphrase
        if (!context.passphrase) {
            await this.generateKeyPair(computeClient, rgName, vmName, newSshKey);
        }

        context.sshPublicKey = newSshKey.publicKey;
        ext.outputChannel.appendLog(localize('createdSshKey', `Created new SSH key "${sshKeyName}".`));

    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.sshPublicKey;
    }

    public async getSshKey(vmName: string, passphrase: string): Promise<string> {
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

    private async generateKeyPair(computeClient: ComputeManagementClient, rgName: string, vmName: string, newSshKey: ComputeManagementModels.SshPublicKeyResource): Promise<void> {
        const sshKeyName: string = `azure_${vmName}_rsa`;
        const sshKeyPath: string = join(sshFsPath, sshKeyName);

        const sshKeyPair: ComputeManagementModels.SshPublicKeyGenerateKeyPairResult = await computeClient.sshPublicKeys.generateKeyPair(rgName, nonNullProp(newSshKey, 'name'));
        await fse.writeFile(`${sshKeyPath}`, sshKeyPair.privateKey);
        newSshKey.publicKey = sshKeyPair.publicKey;
    }
}
