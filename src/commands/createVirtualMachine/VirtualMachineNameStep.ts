/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from "azure-arm-compute";
import { AzureNameStep, createAzureClient, IAzureNamingRules, resourceGroupNamingRules } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nonNullProp, nonNullValueAndProp } from "../../utils/nonNull";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export const virtualMachineNamingRules: IAzureNamingRules = {
    minLength: 1,
    maxLength: 64,
    // cannot accept charactres that are invalid for Linux OS computername which is basically any non-alphanumeric except . and -
    invalidCharsRegExp: /[^a-zA-Z0-9\.\-]/
};

export class VirtualMachineNameStep extends AzureNameStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const namingRules: IAzureNamingRules[] = [resourceGroupNamingRules];
        namingRules.push(virtualMachineNamingRules);

        const rgName: string = wizardContext.newResourceGroupName || nonNullValueAndProp(wizardContext.resourceGroup, 'name');
        const suggestedName: string | undefined = await this.generateRelatedName(wizardContext, rgName, namingRules);

        const prompt: string = localize('virtualMachineNamePrompt', 'Enter a globally unique name for the new virutalMachine.');
        wizardContext.newVirtualMachineName = (await ext.ui.showInputBox({
            value: suggestedName,
            prompt,
            validateInput: async (value: string | undefined): Promise<string | undefined> => await this.validateVirtualMachineName(wizardContext, value)
        })).trim();
    }
    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        return !wizardContext.newVirtualMachineName && !wizardContext.virtualMachine;
    }

    protected async isRelatedNameAvailable(wizardContext: IVirtualMachineWizardContext, name: string): Promise<boolean> {
        return await this.isNameAvailable(wizardContext, name);
    }

    private async validateVirtualMachineName(wizardContext: IVirtualMachineWizardContext, name: string | undefined): Promise<string | undefined> {
        name = name ? name.trim() : '';

        if (name.length < virtualMachineNamingRules.minLength || name.length > virtualMachineNamingRules.maxLength) {
            return localize('invalidLength', 'The name must be between {0} and {1} characters.', virtualMachineNamingRules.minLength, virtualMachineNamingRules.maxLength);
        } else if (name.match(virtualMachineNamingRules.invalidCharsRegExp) !== null) {
            return localize('invalidChars', "The name can only contain alphanumeric characters and the symbols .-");
        } else if (name.endsWith('.') || name.endsWith('-')) {
            return localize('invalidEndingChar', "The name cannot end in a period or hyphen.");
        } else if (!await this.isNameAvailable(wizardContext, name)) {
            return localize('nameAlreadyExists', 'Virtual machine name "{0}" already exists in resource group "{1}".', name, nonNullValueAndProp(wizardContext.resourceGroup, 'name'));
        } else {
            return undefined;
        }
    }

    private async isNameAvailable(wizardContext: IVirtualMachineWizardContext, name: string): Promise<boolean> {
        // Virtual machine name must be unique in the current resource group.
        if (wizardContext.resourceGroup) {
            // only need to check if user used an existing resource group
            const computeClient: ComputeManagementClient = createAzureClient(wizardContext, ComputeManagementClient);
            const vmsInRg: ComputeManagementModels.VirtualMachineListResult = await computeClient.virtualMachines.list(nonNullProp(wizardContext.resourceGroup, 'name'));
            if (vmsInRg.find((vm: ComputeManagementModels.VirtualMachine) => vm.name === name)) {
                return false;
            }
        }

        return true;
    }

}
