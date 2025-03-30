/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkInterface, type NetworkManagementClient, type PublicIPAddress, type Subnet } from '@azure/arm-network';
import { LocationListStep, type AzExtLocation } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStepWithActivityOutput, nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class NetworkInterfaceCreateStep<T extends IVirtualMachineWizardContext> extends AzureWizardExecuteStepWithActivityOutput<T> {
    public priority: number = 250;
    public stepName: string = 'networkInterfaceCreateStep';
    protected getSuccessString = (context: T) => localize('createNetworkInterfaceSuccess', 'Successfully created network interface "{0}".', context.newNetworkInterfaceName || this.formatNetworkInterfaceName(nonNullProp(context, 'newVirtualMachineName')));
    protected getFailString = (context: T) => localize('createNetworkInterfaceFail', 'Failed to create network interface "{0}".', context.newNetworkInterfaceName || this.formatNetworkInterfaceName(nonNullProp(context, 'newVirtualMachineName')));
    protected getTreeItemLabel = (context: T) => localize('createNetworkInterfaceLabel', 'Create network interface "{0}"', context.newNetworkInterfaceName || this.formatNetworkInterfaceName(nonNullProp(context, 'newVirtualMachineName')));

    public async execute(context: T, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        progress.report({ message: localize('creatingNi', 'Creating network interface...') });

        const networkClient: NetworkManagementClient = await createNetworkClient(context);
        const newLocation: AzExtLocation = await LocationListStep.getLocation(context, undefined, true);
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        const { location, extendedLocation } = LocationListStep.getExtendedLocation(newLocation);

        // this is the naming convention used by the portal
        context.newNetworkInterfaceName = context.newNetworkInterfaceName || this.formatNetworkInterfaceName(vmName);

        const publicIpAddress: PublicIPAddress = nonNullProp(context, 'publicIpAddress');
        const subnet: Subnet = nonNullProp(context, 'subnet');
        const networkInterfaceProps: NetworkInterface = {
            location, extendedLocation, ipConfigurations: [{ name: context.newNetworkInterfaceName, publicIPAddress: publicIpAddress, subnet: subnet }]
        };

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        await networkClient.networkInterfaces.beginCreateOrUpdateAndWait(rgName, context.newNetworkInterfaceName, networkInterfaceProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.networkInterface = await networkClient.networkInterfaces.get(rgName, context.newNetworkInterfaceName);
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.networkInterface;
    }

    private formatNetworkInterfaceName(niName: string): string {
        const maxNumofChars: number = 20;
        // the portal truncates the VM name by 20 characters
        niName = niName.substr(0, maxNumofChars);

        for (let i: number = 0; i < 3; i += 1) {
            // as this isn't being used for security purposes, it should be sufficient to use Math.random()
            niName += Math.round(Math.random() * 9);
        }

        return niName;
    }
}
