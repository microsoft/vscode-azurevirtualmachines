/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkInterface, NetworkManagementClient, PublicIPAddress, Subnet } from '@azure/arm-network';
import { Progress } from "vscode";
import { AzExtLocation, AzureWizardExecuteStep, LocationListStep } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { nonNullProp, nonNullValueAndProp } from '../../utils/nonNull';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class NetworkInterfaceCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 250;

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

        const creatingNi: string = localize('creatingNi', `Creating new network interface "${context.newNetworkInterfaceName}"...`);
        progress.report({ message: creatingNi });
        ext.outputChannel.appendLog(creatingNi);

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        await networkClient.networkInterfaces.beginCreateOrUpdateAndWait(rgName, context.newNetworkInterfaceName, networkInterfaceProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.networkInterface = await networkClient.networkInterfaces.get(rgName, context.newNetworkInterfaceName);
        ext.outputChannel.appendLog(localize('createdNi', `Created new network interface "${context.newNetworkInterfaceName}".`));
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
