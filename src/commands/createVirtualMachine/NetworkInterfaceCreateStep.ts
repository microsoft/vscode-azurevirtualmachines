/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkInterface, type NetworkManagementClient, type PublicIPAddress, type Subnet } from '@azure/arm-network';
import { LocationListStep, type AzExtLocation } from '@microsoft/vscode-azext-azureutils';
import { nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { AzureWizardActivityOutputExecuteStep } from '../AzureWizardActivityOutputExecuteStep';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class NetworkInterfaceCreateStep extends AzureWizardActivityOutputExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 250;
    stepName: string = 'networkInterfaceCreateStep';

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = await createNetworkClient(context);

        const newLocation: AzExtLocation = await LocationListStep.getLocation(context, undefined, true);
        const { location, extendedLocation } = LocationListStep.getExtendedLocation(newLocation);

        const vmName: string = nonNullProp(context, 'newVirtualMachineName');

        // this is the naming convention used by the portal
        context.newNetworkInterfaceName = context.newNetworkInterfaceName || this.formatNetworkInterfaceName(vmName);

        const publicIpAddress: PublicIPAddress = nonNullProp(context, 'publicIpAddress');
        const subnet: Subnet = nonNullProp(context, 'subnet');

        const networkInterfaceProps: NetworkInterface = {
            location, extendedLocation, ipConfigurations: [{ name: context.newNetworkInterfaceName, publicIPAddress: publicIpAddress, subnet: subnet }]
        };

        progress.report({ message: this.getProgressString(context) });
        ext.outputChannel.appendLog(this.getProgressString(context));

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vnName = context.newNetworkInterfaceName;
        await networkClient.networkInterfaces.beginCreateOrUpdateAndWait(rgName, vnName, networkInterfaceProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.networkInterface = await networkClient.networkInterfaces.get(rgName, vnName);
        ext.outputChannel.appendLog(this.getSuccessString(context));
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

    protected getSuccessString(context: IVirtualMachineWizardContext): string {
        return localize('createdNi', 'Created new virtual network "{0}".', context.newNetworkInterfaceName);
    }

    protected getProgressString(context: IVirtualMachineWizardContext): string {
        return localize('creatingNi', 'Creating new virtual network "{0}"...', context.newNetworkInterfaceName);
    }

    protected getFailString(context: IVirtualMachineWizardContext): string {
        return this.getSuccessString(context);
    }
}
