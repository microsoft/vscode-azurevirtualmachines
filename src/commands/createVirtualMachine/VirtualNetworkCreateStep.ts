/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkManagementClient, type VirtualNetwork } from '@azure/arm-network';
import { LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStepWithActivityOutput, nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class VirtualNetworkCreateStep<T extends IVirtualMachineWizardContext> extends AzureWizardExecuteStepWithActivityOutput<T> {
    public priority: number = 230;
    public stepName: string = 'virtualNetworkCreateStep';
    protected getOutputLogSuccess = (context: T) => localize('createVirtualNetworkSuccess', 'Successfully created virtual network "{0}".', generateVirtualNetworkName(nonNullProp(context, 'newVirtualMachineName')));
    protected getOutputLogFail = (context: T) => localize('createVirtualNetworkFail', 'Failed to create virtual network "{0}".', generateVirtualNetworkName(nonNullProp(context, 'newVirtualMachineName')));
    protected getTreeItemLabel = (context: T) => localize('createVirtualNetworkLabel', 'Create virtual network "{0}"', generateVirtualNetworkName(nonNullProp(context, 'newVirtualMachineName')));

    public async execute(context: T, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        progress.report({ message: localize('creatingVn', `Creating virtual network...`) });

        const networkClient: NetworkManagementClient = await createNetworkClient(context);
        const newLocation = await LocationListStep.getLocation(context, undefined, true);
        const { location, extendedLocation } = LocationListStep.getExtendedLocation(newLocation);

        const virtualNetworkProps: VirtualNetwork = { location, extendedLocation, addressSpace: { addressPrefixes: [nonNullProp(context, 'addressPrefix')] } };
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        const vnName: string = generateVirtualNetworkName(vmName);

        await networkClient.virtualNetworks.beginCreateOrUpdateAndWait(rgName, vnName, virtualNetworkProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.virtualNetwork = await networkClient.virtualNetworks.get(rgName, vnName);
    }

    public shouldExecute(context: T): boolean {
        return !context.virtualNetwork;
    }
}

// network names can't be 1 character and will fail the creation
function generateVirtualNetworkName(newVirtualMachineName: string): string {
    return newVirtualMachineName.length === 1 ? `${newVirtualMachineName}-vnet` : newVirtualMachineName;
}
