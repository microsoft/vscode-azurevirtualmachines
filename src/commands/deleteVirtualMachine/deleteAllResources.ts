/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type GenericResourceExpanded, type ResourceManagementClient } from "@azure/arm-resources";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { type IActionContext, type ISubscriptionContext } from "@microsoft/vscode-azext-utils";
import { networkInterfaceLabel, virtualMachineLabel, virtualNetworkLabel } from "../../constants";
import { localize } from "../../localize";
import { createResourceClient } from "../../utils/azureClients";
import { type ResourceToDelete } from "./deleteConstants";
import { deleteWithOutput } from "./deleteWithOutput";

export async function deleteAllResources(context: IActionContext, subscription: ISubscriptionContext, resourceGroupName: string, resourcesToDelete: ResourceToDelete[]): Promise<ResourceToDelete[]> {
    const failedResources: ResourceToDelete[] = [];

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

    const resourceClient: ResourceManagementClient = await createResourceClient([context, subscription]);

    const resources: GenericResourceExpanded[] = await uiUtils.listAllIterator(resourceClient.resources.listByResourceGroup(resourceGroupName));
    if (resources.length === 0) {
        await deleteWithOutput(
            {
                resourceName: resourceGroupName, resourceType: localize('resourceGroup', 'resource group'),
                deleteMethod: async (): Promise<void> => { await resourceClient.resourceGroups.beginDeleteAndWait(resourceGroupName); }
            },
            failedResources);
    }

    return failedResources;
}
