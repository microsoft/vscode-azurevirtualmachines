/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceManagementClient } from "@azure/arm-resources";
import { ISubscriptionContext } from "vscode-azureextensionui";
import { localize } from "../../localize";
import { createResourceClient } from "../../utils/azureClients";
import { networkInterfaceLabel, ResourceDeleteError, ResourceToDelete, virtualMachineLabel, virtualNetworkLabel } from "./deleteConstants";
import { deleteWithOutput } from "./deleteWithOutput";

export async function deleteAllResources(context: ISubscriptionContext, resourceGroupName: string, resourcesToDelete: ResourceToDelete[]): Promise<ResourceDeleteError[]> {
    const errors: ResourceDeleteError[] = [];

    // virtual machines have to be deleted before a lot of other resources so do it first
    const virtualMachineIndex: number = resourcesToDelete.findIndex(r => { return r.resourceType === virtualMachineLabel; });
    if (virtualMachineIndex >= 0) {
        await deleteWithOutput(resourcesToDelete.splice(virtualMachineIndex, 1)[0], errors);
    }

    // network interfaces have to be delete before public IP and virtual networks
    const networkInterfaceIndex: number = resourcesToDelete.findIndex(r => { return r.resourceType === networkInterfaceLabel; });
    if (networkInterfaceIndex >= 0) {
        await deleteWithOutput(resourcesToDelete.splice(networkInterfaceIndex, 1)[0], errors);
    }

    // virtual networks have to be deleted before nsg but after network interface
    const virtualNetworkIndex: number = resourcesToDelete.findIndex(r => { return r.resourceType === virtualNetworkLabel; });
    if (virtualNetworkIndex >= 0) {
        await deleteWithOutput(resourcesToDelete.splice(virtualNetworkIndex, 1)[0], errors);
    }

    await Promise.all(resourcesToDelete.map(async r => {
        await deleteWithOutput(r, errors);
    }));

    const resourceClient: ResourceManagementClient = await createResourceClient(context);

    if ((await resourceClient.resources.listByResourceGroup(resourceGroupName)).length === 0) {
        await deleteWithOutput(
            {
                resourceName: resourceGroupName, resourceType: localize('resourceGroup', 'resource group'),
                deleteMethod: async (): Promise<void> => { await resourceClient.resourceGroups.deleteMethod(resourceGroupName); }
            },
            errors);
    }

    return errors;
}
