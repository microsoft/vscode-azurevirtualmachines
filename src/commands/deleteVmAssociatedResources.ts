/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient, NetworkManagementModels } from "@azure/arm-network";
import { ResourceManagementClient } from "@azure/arm-resources";
import { IAzureQuickPickItem, ISubscriptionContext, parseError } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { createComputeClient, createNetworkClient, createResourceClient } from "../utils/azureClients";
import { getNameFromId } from "../utils/azureUtils";
import { nonNullValueAndProp } from "../utils/nonNull";

export type resourceToDelete = { resourceName: string; resourceType: string; deleteMethod(): Promise<void> };
const virtualNetworkLabel: string = localize('virtualNetwork', 'virtual network');
const networkInterfaceLabel: string = localize('networkInterface', 'network interface');

export async function getResourcesToDelete(
    context: ISubscriptionContext,
    resourceGroupName: string,
    networkNames: string[],
    diskName: string): Promise<resourceToDelete[]> {

    const associatedResources: resourceToDelete[] = [];
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

export async function promptResourcesToDelete(vmName: string, resources: resourceToDelete[]): Promise<IAzureQuickPickItem<resourceToDelete>[]> {

    const quickPicks: IAzureQuickPickItem<resourceToDelete>[] = resources.map(resource => {
        return { label: resource.resourceName, description: toTitleCase(resource.resourceType), data: resource };
    });

    return await ext.ui.showQuickPick(quickPicks, { placeHolder: localize('selectResources', 'Select resources associated to "{0}" to delete', vmName), canPickMany: true });
}

export async function deleteAllResources(context: ISubscriptionContext, resourceGroupName: string, resourcesToDelete: IAzureQuickPickItem<resourceToDelete>[]): Promise<void> {
    // network interfaces have to be delete before public IP and virtual networks
    const networkInterfaceIndex: number = resourcesToDelete.findIndex(r => { return r.data.resourceType === networkInterfaceLabel; });
    if (networkInterfaceIndex >= 0) {
        await deleteWithOutput(resourcesToDelete.splice(networkInterfaceIndex, 1)[0].data);
    }

    // virtual networks have to be deleted before nsg but after network interface
    const virtualNetworkIndex: number = resourcesToDelete.findIndex(r => { return r.data.resourceType === virtualNetworkLabel; });
    if (virtualNetworkIndex >= 0) {
        await deleteWithOutput(resourcesToDelete.splice(virtualNetworkIndex, 1)[0].data);
    }

    await Promise.all(resourcesToDelete.map(async r => {
        await deleteWithOutput(r.data);
    }));

    const resourceClient: ResourceManagementClient = await createResourceClient(context);
    if ((await resourceClient.resources.listByResourceGroup(resourceGroupName)).length === 0) {
        await deleteWithOutput({
            resourceName: resourceGroupName, resourceType: localize('resourceGroup', 'resource group'),
            deleteMethod: async (): Promise<void> => { await resourceClient.resourceGroups.deleteMethod(resourceGroupName); }
        });
    }
}

export async function deleteWithOutput(resource: resourceToDelete): Promise<void> {
    const deleting: string = localize('Deleting', 'Deleting {0} "{1}"...', resource.resourceType, resource.resourceName);
    const deleteSucceeded: string = localize('DeleteSucceeded', 'Successfully deleted {0} "{1}".', resource.resourceType, resource.resourceName);

    ext.outputChannel.appendLog(deleting);
    try {
        await resource.deleteMethod();
    } catch (error) {
        ext.outputChannel.appendLog(localize('deleteFailed', 'Deleting {0} "{1}" failed with the error "{2}"', resource.resourceType, resource.resourceName, parseError(error).message));
        return;
    }

    ext.outputChannel.appendLog(deleteSucceeded);
}

function toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}
