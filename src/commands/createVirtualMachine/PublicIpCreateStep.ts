/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkManagementClient, type PublicIPAddress } from '@azure/arm-network';
import { LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStepWithActivityOutput, nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class PublicIpCreateStep<T extends IVirtualMachineWizardContext> extends AzureWizardExecuteStepWithActivityOutput<T> {
    public priority: number = 210;
    public stepName: string = 'publicIpCreateStep';
    protected getSuccessString = (context: T) => localize('createPublicIpSuccess', 'Successfully created public IP address "{0}".', generateIpName(nonNullProp(context, 'newVirtualMachineName')));
    protected getFailString = (context: T) => localize('createPublicIpFail', 'Failed to create public IP address "{0}".', generateIpName(nonNullProp(context, 'newVirtualMachineName')));
    protected getTreeItemLabel = (context: T) => localize('createPublicIpLabel', 'Create public IP address "{0}"', generateIpName(nonNullProp(context, 'newVirtualMachineName')));

    public async execute(context: T, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        progress.report({ message: localize('creatingIp', `Creating public IP address...`) });

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
        const ipName: string = generateIpName(nonNullProp(context, 'newVirtualMachineName'));

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
    }

    public shouldExecute(context: T): boolean {
        return !context.publicIpAddress;
    }
}

// when creating a VM on the portal, this is the suffix that is added to the public IP address
function generateIpName(newVirtualMachineName: string): string {
    return newVirtualMachineName + '-ip';
}
