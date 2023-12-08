/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkManagementClient, type VirtualNetwork } from '@azure/arm-network';
import { LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStep, nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class VirtualNetworkCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 230;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = await createNetworkClient(context);

        const newLocation = await LocationListStep.getLocation(context, undefined, true);
        const { location, extendedLocation } = LocationListStep.getExtendedLocation(newLocation);

        const virtualNetworkProps: VirtualNetwork = { location, extendedLocation, addressSpace: { addressPrefixes: [nonNullProp(context, 'addressPrefix')] } };
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        // network names can't be 1 character and will fail the creation
        const vnName: string = vmName.length === 1 ? `${vmName}-vnet` : vmName;

        const creatingVn: string = localize('creatingVn', `Creating new virtual network "${vnName}"...`);
        ext.outputChannel.appendLog(creatingVn);
        progress.report({ message: creatingVn });
        await networkClient.virtualNetworks.beginCreateOrUpdateAndWait(rgName, vnName, virtualNetworkProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.virtualNetwork = await networkClient.virtualNetworks.get(rgName, vnName);
        ext.outputChannel.appendLog(localize('creatingVn', `Created new virtual network "${vnName}".`));
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.virtualNetwork;
    }
}
