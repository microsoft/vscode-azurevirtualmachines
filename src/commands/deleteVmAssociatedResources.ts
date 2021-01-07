/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient, NetworkManagementModels } from "@azure/arm-network";
import { ResourceManagementClient } from "@azure/arm-resources";
import { ISubscriptionContext, parseError } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { createComputeClient, createNetworkClient, createResourceClient } from "../utils/azureClients";
import { getNameFromId } from "../utils/azureUtils";
import { nonNullValueAndProp } from "../utils/nonNull";

export async function deleteVmAssociatedResources(
    context: ISubscriptionContext,
    resourceGroupName: string,
    networkNames: string[],
    diskName: string): Promise<void> {

    const networkClient: NetworkManagementClient = await createNetworkClient(context);

    for (const networkName of networkNames) {
        const networkInterface: NetworkManagementModels.NetworkInterface = await networkClient.networkInterfaces.get(resourceGroupName, networkName);
        await networkClient.networkInterfaces.deleteMethod(resourceGroupName, networkName);

        if (networkInterface.ipConfigurations) {
            for (const ipConfigurations of networkInterface.ipConfigurations) {
                const publicIpName: string = getNameFromId(nonNullValueAndProp(ipConfigurations.publicIPAddress, 'id'));
                const subnetId: string = nonNullValueAndProp(ipConfigurations.subnet, 'id');
                // example of subnet id: '/subscriptions/9b5c7ccb-9857-4307-843b-8875e83f65e9/resourceGroups/linux-vm/providers/Microsoft.Network/virtualNetworks/linux-vm/subnets/default'
                const virtualNetworkName: string = subnetId.split('/')[8];
                const subnetName: string = getNameFromId(subnetId);
                const subnet: NetworkManagementModels.Subnet = await networkClient.subnets.get(resourceGroupName, virtualNetworkName, subnetName);
                const nsgName: string = getNameFromId(nonNullValueAndProp(subnet.networkSecurityGroup, 'id'));

                await deleteWithOutput(publicIpName, localize('publicip', 'public IP address'), async () => { await networkClient.publicIPAddresses.deleteMethod(resourceGroupName, publicIpName); });
                await deleteWithOutput(virtualNetworkName, localize('virtualNetwork', 'virtual network'), async () => { await networkClient.virtualNetworks.deleteMethod(resourceGroupName, virtualNetworkName); });
                await deleteWithOutput(nsgName, localize('networkSecurityGroup', 'network security group'), async () => { await networkClient.networkSecurityGroups.deleteMethod(resourceGroupName, nsgName); });

            }
        }
    }

    const computeClient: ComputeManagementClient = await createComputeClient(context);
    await deleteWithOutput(diskName, localize('disk', 'disk'), async () => { await computeClient.disks.deleteMethod(resourceGroupName, diskName); });

    const resourceClient: ResourceManagementClient = await createResourceClient(context);
    if ((await resourceClient.resources.listByResourceGroup(resourceGroupName)).length === 0) {
        await deleteWithOutput(resourceGroupName, localize('resourceGroup', 'resource group'), async () => { await resourceClient.resourceGroups.deleteMethod(resourceGroupName); });
    }
}

async function deleteWithOutput(name: string, resourceLabel: string, deleteMethod: () => Promise<void>): Promise<void> {
    const deleting: string = localize('Deleting', 'Deleting {0} "{1}"...', resourceLabel, name);
    const deleteSucceeded: string = localize('DeleteSucceeded', 'Successfully deleted {0} "{1}".', resourceLabel, name);

    ext.outputChannel.appendLog(deleting);
    try {
        await deleteMethod();
    } catch (error) {
        ext.outputChannel.appendLog(localize('deleteFailed', 'Deleting {0} "{1}" failed with the error "{2}"', resourceLabel, name, parseError(error).message));
        return;
    }

    ext.outputChannel.appendLog(deleteSucceeded);
}
