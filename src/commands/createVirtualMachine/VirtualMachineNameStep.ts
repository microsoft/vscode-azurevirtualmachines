/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, VirtualMachine } from "@azure/arm-compute";
import { AzureNameStep, IAzureNamingRules, ResourceGroupListStep, resourceGroupNamingRules, uiUtils } from "vscode-azureextensionui";
import { localize } from "../../localize";
import { createComputeClient } from "../../utils/azureClients";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export const virtualMachineNamingRules: IAzureNamingRules = {
    minLength: 1,
    maxLength: 64,
    // cannot accept characters that are invalid for Linux OS computername which is basically any non-alphanumeric except . and -
    invalidCharsRegExp: /[^a-zA-Z0-9\.\-]/
};

export class VirtualMachineNameStep extends AzureNameStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const namingRules: IAzureNamingRules[] = [resourceGroupNamingRules];
        namingRules.push(virtualMachineNamingRules);

        const prompt: string = localize('virtualMachineNamePrompt', 'Enter a name for the new virtual machine.');
        context.newVirtualMachineName = (await context.ui.showInputBox({
            prompt,
            validateInput: async (value: string | undefined): Promise<string | undefined> => await this.validateVirtualMachineName(context, value)
        })).trim();
        context.valuesToMask.push(context.newVirtualMachineName);
        context.relatedNameTask = this.generateRelatedName(context, context.newVirtualMachineName, resourceGroupNamingRules);

    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return !context.newVirtualMachineName && !context.virtualMachine;
    }

    protected async isRelatedNameAvailable(context: IVirtualMachineWizardContext, name: string): Promise<boolean> {
        return await ResourceGroupListStep.isNameAvailable(context, name);
    }

    private async validateVirtualMachineName(context: IVirtualMachineWizardContext, name: string | undefined): Promise<string | undefined> {
        name = name ? name.trim() : '';

        if (name.length < virtualMachineNamingRules.minLength || name.length > virtualMachineNamingRules.maxLength) {
            return localize('invalidLength', 'The name must be between {0} and {1} characters.', virtualMachineNamingRules.minLength, virtualMachineNamingRules.maxLength);
        } else if (virtualMachineNamingRules.invalidCharsRegExp.test(name)) {
            return localize('invalidChars', "The name can only contain alphanumeric characters and the symbols '.' and '-'");
        } else if (name.startsWith('.') || name.endsWith('.') || name.startsWith('-') || name.endsWith('-')) {
            return localize('invalidEndingChar', "The name cannot start or end in a '.' or '-'.");
        } else if (context.resourceGroup?.name && !await this.isNameAvailableInRG(context, context.resourceGroup.name, name)) {
            return localize('nameAlreadyExists', 'Virtual machine name "{0}" already exists in resource group "{1}".', name, context.resourceGroup.name);
        } else {
            return undefined;
        }
    }

    private async isNameAvailableInRG(context: IVirtualMachineWizardContext, rgName: string, name: string): Promise<boolean> {
        // Virtual machine names must be unique to the current resource group.
        const computeClient: ComputeManagementClient = await createComputeClient(context);
        const vmsInRg: VirtualMachine[] = await uiUtils.listAllIterator(computeClient.virtualMachines.list(rgName));
        if (vmsInRg.find((vm: VirtualMachine) => vm.name === name)) {
            return false;
        }

        return true;
    }
}
