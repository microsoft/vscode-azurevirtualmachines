/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkManagementClient, type VirtualNetwork } from '@azure/arm-network';
import { LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { AzureWizardActivityOutputExecuteStep } from '../AzureWizardActivityOutputExecuteStep';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class VirtualNetworkCreateStep extends AzureWizardActivityOutputExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 230;
    stepName: string = 'virtualNetworkCreateStep';

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = await createNetworkClient(context);

        const newLocation = await LocationListStep.getLocation(context, undefined, true);
        const { location, extendedLocation } = LocationListStep.getExtendedLocation(newLocation);

        const virtualNetworkProps: VirtualNetwork = { location, extendedLocation, addressSpace: { addressPrefixes: [nonNullProp(context, 'addressPrefix')] } };
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        // network names can't be 1 character and will fail the creation
        const vnName: string = vmName.length === 1 ? `${vmName}-vnet` : vmName;

        ext.outputChannel.appendLog(this.getProgressString(context));
        progress.report({ message: this.getProgressString(context) });
        await networkClient.virtualNetworks.beginCreateOrUpdateAndWait(rgName, vnName, virtualNetworkProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.virtualNetwork = await networkClient.virtualNetworks.get(rgName, vnName);
        ext.outputChannel.appendLog(this.getSuccessString(context));
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.virtualNetwork;
    }

    public getSuccessString(context: IVirtualMachineWizardContext): string {
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        const vnName: string = vmName.length === 1 ? `${vmName}-vnet` : vmName;
        return localize('createdVm', 'Created new virtual network "{0}".', vnName);
    }

    public getProgressString(context: IVirtualMachineWizardContext): string {
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        const vnName: string = vmName.length === 1 ? `${vmName}-vnet` : vmName;
        return localize('creatingVm', 'Creating new virtual network "{0}".', vnName);
    }

    protected getFailString(context: IVirtualMachineWizardContext): string {
        return this.getSuccessString(context);
    }
}
