/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkManagementClient, type NetworkSecurityGroup, type SecurityRule } from '@azure/arm-network';
import { LocationListStep } from "@microsoft/vscode-azext-azureutils";
import { nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { AzureWizardActivityOutputExecuteStep } from '../AzureWizardActivityOutputExecuteStep';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class NetworkSecurityGroupCreateStep extends AzureWizardActivityOutputExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 220;
    stepName: string = 'nsgCreateStep';

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = await createNetworkClient(context);
        const location: string = (await LocationListStep.getLocation(context)).name

        // when creating a VM on the portal, this is the suffix that is added to the network security group
        const nsgName: string = nonNullProp(context, 'newVirtualMachineName') + '-nsg';

        const securityRules: SecurityRule[] = context.os !== 'Windows' ? [
            { name: 'SSH', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '22', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 340, direction: 'Inbound' },
            { name: 'HTTPS', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '443', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 320, direction: 'Inbound' },
            { name: 'HTTP', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '80', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 300, direction: 'Inbound' }
        ] : [{ name: 'RDP', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '3389', sourceAddressPrefix: '*', destinationAddressPrefix: '*', access: 'Allow', priority: 300, direction: 'Inbound' }];

        // NSGs cannot be created in Edge Zones
        const networkSecurityGroupProps: NetworkSecurityGroup = {
            name: nsgName, location, securityRules
        };

        const enabledPorts: string[] = nonNullProp(networkSecurityGroupProps, 'securityRules').map(rule => nonNullProp(rule, 'destinationPortRange'));

        const creatingNsg: string = localize('creatingNsg', `Creating new network security group "${nsgName}" with inbound ports ${enabledPorts.join(', ')} enabled...`);
        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        ext.outputChannel.appendLog(creatingNsg);
        progress.report({ message: creatingNsg });

        await networkClient.networkSecurityGroups.beginCreateOrUpdateAndWait(rgName, nsgName, networkSecurityGroupProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.networkSecurityGroup = await networkClient.networkSecurityGroups.get(rgName, nsgName);
        ext.outputChannel.appendLog(this.getSuccessString(context));
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.networkSecurityGroup;
    }

    protected getProgressString(context: IVirtualMachineWizardContext): string {
        const nsgName: string = nonNullProp(context, 'newVirtualMachineName') + '-nsg';
        return localize('createdNsg', 'Creating new network security group "{0}"...', nsgName);
    }

    protected getSuccessString(context: IVirtualMachineWizardContext): string {
        const nsgName: string = nonNullProp(context, 'newVirtualMachineName') + '-nsg';
        return localize('createdNsg', 'Created new network security group "{0}".', nsgName);
    }

    protected getFailString(context: IVirtualMachineWizardContext): string {
        return this.getSuccessString(context);
    }
}
