/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkManagementClient, type NetworkSecurityGroup, type SecurityRule } from '@azure/arm-network';
import { LocationListStep } from "@microsoft/vscode-azext-azureutils";
import { AzureWizardExecuteStepWithActivityOutput, nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class NetworkSecurityGroupCreateStep<T extends IVirtualMachineWizardContext> extends AzureWizardExecuteStepWithActivityOutput<T> {
    public priority: number = 220;
    public stepName: string = 'networkSecurityGroupCreateStep';
    protected getSuccessString = (context: T) => localize('createNetworkSecurityGroupSuccess', 'Successfully created network security group "{0}" with inbound ports "{1}" enabled.', generateNsgName(nonNullProp(context, 'newVirtualMachineName')), this.enabledPorts.join(', '));
    protected getFailString = (context: T) => localize('createNetworkSecurityGroupFail', 'Failed to create network security group "{0}".', generateNsgName(nonNullProp(context, 'newVirtualMachineName')));
    protected getTreeItemLabel = (context: T) => localize('createNetworkSecurityGroupLabel', 'Create network security group "{0}"', generateNsgName(nonNullProp(context, 'newVirtualMachineName')));

    private enabledPorts: string[] = [];

    public async execute(context: T, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        progress.report({ message: localize('creatingNsg', 'Creating network security group...') });

        const networkClient: NetworkManagementClient = await createNetworkClient(context);
        const location: string = (await LocationListStep.getLocation(context)).name
        const nsgName: string = generateNsgName(nonNullProp(context, 'newVirtualMachineName'));
        const securityRules: SecurityRule[] = context.os !== 'Windows' ? [
            { name: 'SSH', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '22', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 340, direction: 'Inbound' },
            { name: 'HTTPS', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '443', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 320, direction: 'Inbound' },
            { name: 'HTTP', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '80', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 300, direction: 'Inbound' }
        ] : [{ name: 'RDP', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '3389', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 300, direction: 'Inbound' }];

        // NSGs cannot be created in Edge Zones
        const networkSecurityGroupProps: NetworkSecurityGroup = {
            name: nsgName, location, securityRules
        };

        this.enabledPorts = nonNullProp(networkSecurityGroupProps, 'securityRules').map(rule => nonNullProp(rule, 'destinationPortRange'));

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        await networkClient.networkSecurityGroups.beginCreateOrUpdateAndWait(rgName, nsgName, networkSecurityGroupProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.networkSecurityGroup = await networkClient.networkSecurityGroups.get(rgName, nsgName);
    }

    public shouldExecute(context: T): boolean {
        return !context.networkSecurityGroup;
    }
}

// when creating a VM on the portal, this is the suffix that is added to the network security group
function generateNsgName(newVirtualMachineName: string): string {
    return newVirtualMachineName + '-nsg';
}
