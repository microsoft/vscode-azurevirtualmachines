/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkManagementClient, NetworkManagementModels } from 'azure-arm-network';
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { nonNullProp, nonNullValueAndProp } from '../../utils/nonNull';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class VirtualNetworkCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 220;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = createAzureClient(context, NetworkManagementClient);
        const location: string = nonNullValueAndProp(context.location, 'name');

        const virtualNetworkProps: NetworkManagementModels.VirtualNetwork = { location, addressSpace: { addressPrefixes: [nonNullProp(context, 'addressPrefix')] } };
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vnName: string = nonNullProp(context, 'newVirtualMachineName') + '-vnet';

        progress.report({ message: 'Creating virtual network...' });
        context.virtualNetwork = await networkClient.virtualNetworks.createOrUpdate(rgName, vnName, virtualNetworkProps);
    }
    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.virtualNetwork;
    }

}
