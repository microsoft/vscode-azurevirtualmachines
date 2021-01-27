/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceManagementClient, ResourceManagementModels } from "@azure/arm-resources";
import { ISubscriptionContext } from "vscode-azureextensionui";
import { localize } from "../../localize";
import { createResourceClient } from "../../utils/azureClients";
import { networkInterfaceLabel, ResourceToDelete, virtualMachineLabel, virtualNetworkLabel } from "./deleteConstants";
import { deleteWithOutput } from "./deleteWithOutput";

export async function deleteAllResources(context: ISubscriptionContext, resourceGroupName: string, resourcesToDelete: ResourceToDelete[]): Promise<string[]> {
    const failedResources: string[] = [];

    // virtual machines have to be deleted before a lot of other resources so do it first
    // network interfaces have to be delete before public IP and virtual networks
    // virtual networks have to be deleted before nsg but after network interface
    // the rest can be deleted in parallel
    const orderedLabels: string[] = [virtualMachineLabel, networkInterfaceLabel, virtualNetworkLabel];
    const serialResources: ResourceToDelete[] = [];
    const parallelResources: ResourceToDelete[] = [];
    for (const resource of resourcesToDelete) {
        orderedLabels.includes(resource.resourceType) ? serialResources.push(resource) : parallelResources.push(resource);
    }

    serialResources.sort((a, b) => orderedLabels.indexOf(a.resourceType) - orderedLabels.indexOf(b.resourceType));
    for (const resource of serialResources) {
        await deleteWithOutput(resource, failedResources);
    }

    await Promise.all(parallelResources.map(async r => await deleteWithOutput(r, failedResources)));

    const resourceClient: ResourceManagementClient = await createResourceClient(context);

    const resources: ResourceManagementModels.ResourceListResult = await resourceClient.resources.listByResourceGroup(resourceGroupName);
    // It's unlikely "nextLink" will be defined if the first batch returned no resources, but technically possible. We'll just skip deleting in that case
    if (resources.length === 0 && !resources.nextLink) {
        await deleteWithOutput(
            {
                resourceName: resourceGroupName, resourceType: localize('resourceGroup', 'resource group'),
                deleteMethod: async (): Promise<void> => { await resourceClient.resourceGroups.deleteMethod(resourceGroupName); }
            },
            failedResources);
    }

    return failedResources;
}
