/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkManagementClient, NetworkManagementModels } from '@azure/arm-network';
import { Progress } from "vscode";
import { AzureWizardExecuteStep, LocationListStep } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { nonNullProp, nonNullValueAndProp } from '../../utils/nonNull';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class VirtualNetworkCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 230;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = await createNetworkClient(context);
        const location: string = (await LocationListStep.getLocation(context)).name;

        const virtualNetworkProps: NetworkManagementModels.VirtualNetwork = { location, addressSpace: { addressPrefixes: [nonNullProp(context, 'addressPrefix')] } };
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        // network names can't be 1 character and will fail the creation
        const vnName: string = vmName.length === 1 ? `${vmName}-vnet` : vmName;

        const creatingVn: string = localize('creatingVn', `Creating new virtual network "${vnName}"...`);
        ext.outputChannel.appendLog(creatingVn);
        progress.report({ message: creatingVn });

        context.virtualNetwork = await networkClient.virtualNetworks.createOrUpdate(rgName, vnName, virtualNetworkProps);
        ext.outputChannel.appendLog(localize('creatingVn', `Created new virtual network "${vnName}".`));
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.virtualNetwork;
    }
}
