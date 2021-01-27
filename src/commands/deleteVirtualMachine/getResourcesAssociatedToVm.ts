/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient, NetworkManagementModels } from "@azure/arm-network";
import { localize } from "../../localize";
import { VirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { createComputeClient, createNetworkClient } from "../../utils/azureClients";
import { getNameFromId } from "../../utils/azureUtils";
import { networkInterfaceLabel, ResourceToDelete, virtualNetworkLabel } from "./deleteConstants";

export async function getResourcesAssociatedToVm(node: VirtualMachineTreeItem): Promise<ResourceToDelete[]> {

    const associatedResources: ResourceToDelete[] = [];

    const networkNames: string[] = [];
    if (node.data.networkProfile?.networkInterfaces) {
        for (const networkRef of node.data.networkProfile?.networkInterfaces) {
            if (networkRef.id) {
                networkNames.push(getNameFromId(networkRef.id));
            }
        }

    }

    const resourceGroupName: string = node.resourceGroup;
    const networkClient: NetworkManagementClient = await createNetworkClient(node.root);
    for (const networkName of networkNames) {
        // if we fail to get a resource, we keep trying to get all associated resources we can rather than erroring out
        try {
            const networkInterface: NetworkManagementModels.NetworkInterface = await networkClient.networkInterfaces.get(resourceGroupName, networkName);
            associatedResources.push({
                resourceName: networkName, resourceType: networkInterfaceLabel,
                deleteMethod: async (): Promise<void> => { await networkClient.networkInterfaces.deleteMethod(resourceGroupName, networkName); }
            });

            if (networkInterface.ipConfigurations) {
                for (const ipConfigurations of networkInterface.ipConfigurations) {
                    if (ipConfigurations.publicIPAddress?.id) {
                        const publicIpName: string = getNameFromId(ipConfigurations.publicIPAddress.id);
                        associatedResources.push({
                            resourceName: publicIpName, resourceType: localize('publicip', 'public IP address'),
                            deleteMethod: async (): Promise<void> => { await networkClient.publicIPAddresses.deleteMethod(resourceGroupName, publicIpName); }
                        });

                    }

                    if (ipConfigurations.subnet?.id) {
                        const subnetId: string = ipConfigurations.subnet.id;
                        // example of subnet id: '/subscriptions/9b5c7ccb-9857-4307-843b-8875e83f65e9/resourceGroups/linux-vm/providers/Microsoft.Network/virtualNetworks/linux-vm/subnets/default'
                        const virtualNetworkName: string = subnetId.split('/')[8];
                        associatedResources.push({
                            resourceName: virtualNetworkName, resourceType: virtualNetworkLabel,
                            deleteMethod: async (): Promise<void> => { await networkClient.virtualNetworks.deleteMethod(resourceGroupName, virtualNetworkName); }
                        });

                        const subnetName: string = getNameFromId(subnetId);
                        try {
                            const subnet: NetworkManagementModels.Subnet = await networkClient.subnets.get(resourceGroupName, virtualNetworkName, subnetName);
                            if (subnet.networkSecurityGroup?.id) {
                                const nsgName: string = getNameFromId(subnet.networkSecurityGroup.id);
                                associatedResources.push({
                                    resourceName: nsgName, resourceType: localize('networkSecurityGroup', 'network security group'),
                                    deleteMethod: async (): Promise<void> => { await networkClient.networkSecurityGroups.deleteMethod(resourceGroupName, nsgName); }
                                });
                            }
                        } catch (err) {
                            // ignore error
                        }
                    }

                }
            }
        } catch (err) {
            // ignore error
        }
    }

    // if we can't retrieve the disk name, it's highly likely that it's the same as the vmName if it was created from the extension
    const diskName: string = node.data.storageProfile?.osDisk?.managedDisk?.id ? getNameFromId(node.data.storageProfile.osDisk.managedDisk.id) : node.name;
    const computeClient: ComputeManagementClient = await createComputeClient(node.root);
    associatedResources.push({
        resourceName: diskName, resourceType: localize('disk', 'disk'),
        deleteMethod: async (): Promise<void> => { await computeClient.disks.deleteMethod(resourceGroupName, diskName); }
    });

    return associatedResources;
}
