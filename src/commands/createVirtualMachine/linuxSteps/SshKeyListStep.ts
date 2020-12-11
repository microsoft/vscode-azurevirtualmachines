/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import * as fse from "fs-extra";
import { Uri } from 'vscode';
import { AzureWizardPromptStep, IAzureQuickPickItem, IWizardOptions } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { createComputeClient } from '../../../utils/azureClients';
import { getResourceGroupFromId } from '../../../utils/azureUtils';
import { nonNullValue } from '../../../utils/nonNull';
import { sshFsPath } from '../../../utils/sshUtils';
import { IVirtualMachineWizardContext } from '../IVirtualMachineWizardContext';
import { PassphrasePromptStep } from './PassphrasePromptStep';

export class SshKeyListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const computeClient: ComputeManagementClient = await createComputeClient(wizardContext);
        const sshKeys: ComputeManagementModels.SshPublicKeysGroupListResult = await computeClient.sshPublicKeys.listBySubscription();

        const picks: IAzureQuickPickItem<string | undefined>[] = sshKeys.map((key) => {
            return { label: nonNullValue(key.name), description: getResourceGroupFromId(nonNullValue(key.id)).toLocaleLowerCase(), data: key.publicKey };
        });

        picks.unshift({
            label: localize('existingPublicKey', '$(folder) Use existing public key'),
            description: '',
            data: ''
        });

        picks.unshift({
            label: localize('NewSshKey', '$(plus) Generate new key pair in Azure'),
            description: '',
            data: undefined
        });

        wizardContext.sshPublicKey = (await ext.ui.showQuickPick(picks, { placeHolder: localize('selectOS', 'Select an SSH Key.') })).data;

        if (wizardContext.sshPublicKey === '') {
            const sshPublicKey: Uri = (await ext.ui.showOpenDialog({
                defaultUri: Uri.file(sshFsPath),
                filters: { 'SSH Public Key': ['pub'] }
            }))[0];
            wizardContext.sshPublicKey = (await fse.readFile(sshPublicKey.fsPath)).toString();
        }
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        return wizardContext.sshPublicKey === undefined;
    }

    public async getSubWizard(wizardContext: IVirtualMachineWizardContext): Promise<IWizardOptions<IVirtualMachineWizardContext> | undefined> {
        if (wizardContext.sshPublicKey === undefined) {
            return {
                promptSteps: [new PassphrasePromptStep()]
            };
        }

        return undefined;
    }
}
