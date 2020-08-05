/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkManagementClient, NetworkManagementModels } from '@azure/arm-network';
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { nonNullProp, nonNullValueAndProp } from '../../utils/nonNull';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class NetworkSecurityGroupCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 220;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = createAzureClient(context, NetworkManagementClient);
        const location: string = nonNullValueAndProp(context.location, 'name');

        // when creating a VM on the portal, this is the suffix that is added to the network security group
        const nsgName: string = nonNullProp(context, 'newVirtualMachineName') + '-nsg';

        const networkSecurityGroupProps: NetworkManagementModels.NetworkSecurityGroup = {
            name: nsgName, location, securityRules: [
                { name: 'SSH', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '22', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 340, direction: 'Inbound' },
                { name: 'HTTPS', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '443', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 320, direction: 'Inbound' },
                { name: 'HTTP', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '80', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 300, direction: 'Inbound' }
            ]
        };

        const enabledPorts: string[] = nonNullProp(networkSecurityGroupProps, 'securityRules').map(rule => nonNullProp(rule, 'destinationPortRange'));

        const creatingNsg: string = localize('creatingNsg', `Creating new network security group "${nsgName}" with inbound ports ${enabledPorts.join(', ')} enabled...`);
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        ext.outputChannel.appendLog(creatingNsg);
        progress.report({ message: creatingNsg });

        context.networkSecurityGroup = await networkClient.networkSecurityGroups.createOrUpdate(rgName, nsgName, networkSecurityGroupProps);
        ext.outputChannel.appendLog(localize('createdNsg', `Created new network security group "${nsgName}".`));
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.networkSecurityGroup;
    }
}
