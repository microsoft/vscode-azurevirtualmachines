/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkInterface, NetworkManagementClient, Subnet } from "@azure/arm-network";
import { IActionContext } from "vscode-azureextensionui";
import { networkInterfaceLabel, virtualNetworkLabel } from "../../constants";
import { localize } from "../../localize";
import { VirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { createComputeClient, createNetworkClient } from "../../utils/azureClients";
import { getNameFromId, getResourceGroupFromId } from "../../utils/azureUtils";
import { ResourceToDelete } from "./deleteConstants";

export async function getResourcesAssociatedToVm(context: IActionContext, node: VirtualMachineTreeItem): Promise<ResourceToDelete[]> {

    const associatedResources: ResourceToDelete[] = [];

    const networkReferences: { name: string; rgName: string }[] = [];
    if (node.data.networkProfile?.networkInterfaces) {
        for (const networkRef of node.data.networkProfile?.networkInterfaces) {
            if (networkRef.id) {
                networkReferences.push({ name: getNameFromId(networkRef.id), rgName: getResourceGroupFromId(networkRef.id) });
            }
        }

    }

    const networkClient: NetworkManagementClient = await createNetworkClient([context, node]);
    for (const networkRef of networkReferences) {
        // if we fail to get a resource, we keep trying to get all associated resources we can rather than erroring out
        try {

            const networkInterface: NetworkInterface = await networkClient.networkInterfaces.get(networkRef.rgName, networkRef.name);
            associatedResources.push({
                resourceName: networkRef.name, resourceType: networkInterfaceLabel,
                deleteMethod: async (): Promise<void> => { await networkClient.networkInterfaces.beginDeleteAndWait(networkRef.rgName, networkRef.name); }
            });

            if (networkInterface.ipConfigurations) {
                for (const ipConfigurations of networkInterface.ipConfigurations) {
                    if (ipConfigurations.publicIPAddress?.id) {
                        const publicIpName: string = getNameFromId(ipConfigurations.publicIPAddress.id);
                        const publicIpRg: string = getResourceGroupFromId(ipConfigurations.publicIPAddress.id);
                        associatedResources.push({
                            resourceName: publicIpName, resourceType: localize('publicip', 'public IP address'),
                            deleteMethod: async (): Promise<void> => { await networkClient.publicIPAddresses.beginDeleteAndWait(publicIpRg, publicIpName); }
                        });

                    }

                    if (ipConfigurations.subnet?.id) {
                        const subnetId: string = ipConfigurations.subnet.id;
                        const subnetRg: string = getResourceGroupFromId(ipConfigurations.subnet.id);
                        // example of subnet id: '/subscriptions/9b5c7ccb-9857-4307-843b-8875e83f65e9/resourceGroups/linux-vm/providers/Microsoft.Network/virtualNetworks/linux-vm/subnets/default'
                        const virtualNetworkName: string = subnetId.split('/')[8];
                        associatedResources.push({
                            resourceName: virtualNetworkName, resourceType: virtualNetworkLabel,
                            deleteMethod: async (): Promise<void> => { await networkClient.virtualNetworks.beginDeleteAndWait(subnetRg, virtualNetworkName); }
                        });

                        const subnetName: string = getNameFromId(subnetId);
                        try {
                            const subnet: Subnet = await networkClient.subnets.get(subnetRg, virtualNetworkName, subnetName);
                            if (subnet.networkSecurityGroup?.id) {
                                const nsgName: string = getNameFromId(subnet.networkSecurityGroup.id);
                                const nsgRg: string = getResourceGroupFromId(subnet.networkSecurityGroup.id);
                                associatedResources.push({
                                    resourceName: nsgName, resourceType: localize('networkSecurityGroup', 'network security group'),
                                    deleteMethod: async (): Promise<void> => { await networkClient.networkSecurityGroups.beginDeleteAndWait(nsgRg, nsgName); }
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

    if (node.data.storageProfile?.osDisk?.managedDisk?.id) {
        const diskName: string = getNameFromId(node.data.storageProfile.osDisk.managedDisk.id);
        const diskRg: string = getResourceGroupFromId(node.data.storageProfile.osDisk.managedDisk.id);
        const computeClient: ComputeManagementClient = await createComputeClient([context, node]);
        associatedResources.push({
            resourceName: diskName, resourceType: localize('disk', 'disk'),
            deleteMethod: async (): Promise<void> => { await computeClient.disks.beginDeleteAndWait(diskRg, diskName); }
        });

    }

    return associatedResources;
}
