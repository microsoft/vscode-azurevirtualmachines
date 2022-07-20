/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkManagementClient, PublicIPAddress } from '@azure/arm-network';
import { LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStep, nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class PublicIpCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 210;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = await createNetworkClient(context);

        const newLocation = await LocationListStep.getLocation(context, undefined, true);
        const { location, extendedLocation } = LocationListStep.getExtendedLocation(newLocation);

        const publicIpProps: PublicIPAddress = {
            publicIPAddressVersion: 'IPv4',
            sku: { name: context.isCustomCloud ? 'Basic' : 'Standard' },
            publicIPAllocationMethod: 'Static',
            location,
            extendedLocation
        };

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');

        // when creating a VM on the portal, this is the suffix that is added to the public IP address
        const ipName: string = nonNullProp(context, 'newVirtualMachineName') + '-ip';

        const creatingIp: string = localize('creatingIp', `Creating new public IP addresss "${ipName}"...`);
        progress.report({ message: creatingIp });
        ext.outputChannel.appendLog(creatingIp);

        try {
            await networkClient.publicIPAddresses.beginCreateOrUpdateAndWait(rgName, ipName, publicIpProps);
            // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
            context.publicIpAddress = await networkClient.publicIPAddresses.get(rgName, ipName);
        } catch (e) {
            if (extendedLocation) {
                throw new Error(localize('mayNotBeSupportedInEdgeZones', 'Failed to create Virtual Machine. This image may not be supported in Edge Zones.'))
            }
            throw e;
        }
        ext.outputChannel.appendLog(localize('creatingIp', `Created new public IP addresss "${ipName}".`));
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.publicIpAddress;
    }
}
