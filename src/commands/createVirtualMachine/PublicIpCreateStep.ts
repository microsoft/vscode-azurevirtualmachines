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

export class PublicIpCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 210;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = createAzureClient(context, NetworkManagementClient);

        const location: string = nonNullValueAndProp(context.location, 'name');
        const publicIpProps: NetworkManagementModels.PublicIPAddress = { publicIPAddressVersion: 'IPv4', sku: { name: 'Standard' }, publicIPAllocationMethod: 'Static', location };

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');

        // when creating a VM on the portal, this is the suffix that is added to the public IP address
        const ipName: string = nonNullProp(context, 'newVirtualMachineName') + '-ip';

        const creatingIp: string = localize('creatingIp', `Creating public IP addresss "${ipName}"...`);
        const createdIp: string = localize('creatingIp', `Created public IP addresss "${ipName}".`);
        progress.report({ message: creatingIp });
        ext.outputChannel.appendLog(creatingIp);

        context.publicIpAddress = await networkClient.publicIPAddresses.createOrUpdate(rgName, ipName, publicIpProps);
        ext.outputChannel.appendLog(createdIp);
    }
    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.publicIpAddress;
    }

}
