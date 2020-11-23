/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkManagementClient, NetworkManagementModels } from '@azure/arm-network';
import { Progress } from "vscode";
import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { nonNullProp, nonNullValueAndProp } from '../../utils/nonNull';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class SubnetCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 240;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = await createNetworkClient(context);

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vnetName: string = nonNullValueAndProp(context.virtualNetwork, 'name');
        // this is the name the portal uses
        const subnetName: string = 'default';

        const creatingSubnet: string = localize('creatingSubnet', `Creating new subnet "${subnetName}"...`);
        const subnetProps: NetworkManagementModels.Subnet = { addressPrefix: nonNullProp(context, 'addressPrefix'), name: subnetName, networkSecurityGroup: context.networkSecurityGroup };

        progress.report({ message: creatingSubnet });
        ext.outputChannel.appendLog(creatingSubnet);

        context.subnet = await networkClient.subnets.createOrUpdate(rgName, vnetName, subnetName, subnetProps);
        ext.outputChannel.appendLog(localize('createdSubnet', `Created new subnet "${subnetName}".`));
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.subnet;
    }
}
