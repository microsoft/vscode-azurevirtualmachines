/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkManagementClient, NetworkManagementModels } from 'azure-arm-network';
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
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

        const creatingVn: string = localize('creatingVn', `Creating new virtual network "${vnName}"...`);
        const createdVn: string = localize('creatingVn', `Created new virtual network "${vnName}".`);

        ext.outputChannel.appendLog(creatingVn);
        progress.report({ message: creatingVn });

        context.virtualNetwork = await networkClient.virtualNetworks.createOrUpdate(rgName, vnName, virtualNetworkProps);
        ext.outputChannel.appendLog(createdVn);
        progress.report({ message: createdVn });
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.virtualNetwork;
    }
}
