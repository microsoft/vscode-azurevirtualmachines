/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkManagementClient, type Subnet } from '@azure/arm-network';
import { AzureWizardExecuteStepWithActivityOutput, nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

const defaultSubnet: string = 'default';

export class SubnetCreateStep<T extends IVirtualMachineWizardContext> extends AzureWizardExecuteStepWithActivityOutput<T> {
    public priority: number = 240;
    public stepName: string = 'subnetCreateStep';
    protected getOutputLogSuccess = () => localize('createSubnetSuccess', 'Successfully created subnet "{0}".', defaultSubnet);
    protected getOutputLogFail = () => localize('createSubnetFail', 'Failed to create subnet "{0}".', defaultSubnet);
    protected getTreeItemLabel = () => localize('createSubnetLabel', 'Create subnet "{0}"', defaultSubnet);

    public async execute(context: T, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        progress.report({ message: localize('creatingSubnet', `Creating new subnet...`) });

        const networkClient: NetworkManagementClient = await createNetworkClient(context);
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vnetName: string = nonNullValueAndProp(context.virtualNetwork, 'name');
        const subnetProps: Subnet = { addressPrefix: nonNullProp(context, 'addressPrefix'), name: defaultSubnet, networkSecurityGroup: context.networkSecurityGroup };

        await networkClient.subnets.beginCreateOrUpdateAndWait(rgName, vnetName, defaultSubnet, subnetProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.subnet = await networkClient.subnets.get(rgName, vnetName, defaultSubnet);
    }

    public shouldExecute(context: T): boolean {
        return !context.subnet;
    }
}
