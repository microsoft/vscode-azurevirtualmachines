/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient, NetworkManagementModels } from "@azure/arm-network";
import { ISubscriptionContext } from "vscode-azureextensionui";
import { localize } from "../../localize";
import { createComputeClient, createNetworkClient } from "../../utils/azureClients";
import { getNameFromId } from "../../utils/azureUtils";
import { nonNullValueAndProp } from "../../utils/nonNull";
import { networkInterfaceLabel, ResourceToDelete, virtualNetworkLabel } from "./deleteConstants";

export async function getResourcesAssociatedToVm(
    context: ISubscriptionContext,
    resourceGroupName: string,
    networkNames: string[],
    diskName: string): Promise<ResourceToDelete[]> {

    const associatedResources: ResourceToDelete[] = [];
    const networkClient: NetworkManagementClient = await createNetworkClient(context);

    for (const networkName of networkNames) {
        const networkInterface: NetworkManagementModels.NetworkInterface = await networkClient.networkInterfaces.get(resourceGroupName, networkName);
        associatedResources.push({
            resourceName: networkName, resourceType: networkInterfaceLabel,
            deleteMethod: async (): Promise<void> => { await networkClient.networkInterfaces.deleteMethod(resourceGroupName, networkName); }
        });

        if (networkInterface.ipConfigurations) {
            for (const ipConfigurations of networkInterface.ipConfigurations) {
                const publicIpName: string = getNameFromId(nonNullValueAndProp(ipConfigurations.publicIPAddress, 'id'));
                const subnetId: string = nonNullValueAndProp(ipConfigurations.subnet, 'id');
                // example of subnet id: '/subscriptions/9b5c7ccb-9857-4307-843b-8875e83f65e9/resourceGroups/linux-vm/providers/Microsoft.Network/virtualNetworks/linux-vm/subnets/default'
                const virtualNetworkName: string = subnetId.split('/')[8];
                const subnetName: string = getNameFromId(subnetId);
                const subnet: NetworkManagementModels.Subnet = await networkClient.subnets.get(resourceGroupName, virtualNetworkName, subnetName);
                const nsgName: string = getNameFromId(nonNullValueAndProp(subnet.networkSecurityGroup, 'id'));

                associatedResources.push({
                    resourceName: publicIpName, resourceType: localize('publicip', 'public IP address'),
                    deleteMethod: async (): Promise<void> => { await networkClient.publicIPAddresses.deleteMethod(resourceGroupName, publicIpName); }
                });

                associatedResources.push({
                    resourceName: virtualNetworkName, resourceType: virtualNetworkLabel,
                    deleteMethod: async (): Promise<void> => { await networkClient.virtualNetworks.deleteMethod(resourceGroupName, virtualNetworkName); }
                });

                associatedResources.push({
                    resourceName: nsgName, resourceType: localize('networkSecurityGroup', 'network security group'),
                    deleteMethod: async (): Promise<void> => { await networkClient.networkSecurityGroups.deleteMethod(resourceGroupName, nsgName); }
                });

            }
        }
    }

    const computeClient: ComputeManagementClient = await createComputeClient(context);
    associatedResources.push({
        resourceName: diskName, resourceType: localize('disk', 'disk'),
        deleteMethod: async (): Promise<void> => { await computeClient.disks.deleteMethod(resourceGroupName, diskName); }
    });

    return associatedResources;
}
