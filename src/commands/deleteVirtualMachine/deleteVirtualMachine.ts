/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { DialogResponses, IActionContext, IAzureQuickPickItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { VirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { createComputeClient } from "../../utils/azureClients";
import { getNameFromId } from "../../utils/azureUtils";
import { nonNullProp, nonNullValue } from "../../utils/nonNull";
import { IDeleteChildImplContext, ResourceToDelete, virtualMachineLabel } from "./deleteConstants";
import { getResourcesAssociatedToVm } from "./getResourcesAssociatedToVm";
import { promptResourcesToDelete } from "./promptResourcesToDelete";

export async function deleteVirtualMachine(context: IActionContext & Partial<IDeleteChildImplContext>, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.allOSContextValue, context);
    }

    // if we can't retrieve the disk name, it's highly likely that it's the same as the vmName if it was created from the extensionf
    const diskName: string = node.data.storageProfile?.osDisk?.managedDisk?.id ? getNameFromId(node.data.storageProfile.osDisk.managedDisk.id) : node.name;

    const networkNames: string[] = [];
    if (node.data.networkProfile && node.data.networkProfile.networkInterfaces) {
        for (const networkRef of node.data.networkProfile?.networkInterfaces) {
            networkNames.push(getNameFromId(nonNullProp(networkRef, 'id')));
        }

    }

    const associatedResources: ResourceToDelete[] = await getResourcesAssociatedToVm(node.root, node.resourceGroup, networkNames, diskName);
    const computeClient: ComputeManagementClient = await createComputeClient(node.root);

    // add the vm to the resources to delete since it is not an associated resource
    associatedResources.unshift({
        resourceName: node.name, resourceType: virtualMachineLabel, picked: true,
        deleteMethod: async (): Promise<void> => { await computeClient.virtualMachines.deleteMethod(nonNullValue(node).resourceGroup, nonNullValue(node).name); }
    });

    const resourcesToDelete: IAzureQuickPickItem<ResourceToDelete>[] = await promptResourcesToDelete(associatedResources);
    const multiDelete: boolean = resourcesToDelete.length > 1;

    const resourceList: string = resourcesToDelete.map(r => `"${r.data.resourceName}"`).join(',');
    const confirmMessage: string = multiDelete ? localize('multiDeleteConfirmation', 'Are you sure you want to delete the following resources: {0}?', resourceList) :
        localize('deleteConfirmation', 'Are you sure you want to delete {0} "{1}"?', resourcesToDelete[0].data.resourceType, resourcesToDelete[0].data.resourceName);

    await ext.ui.showWarningMessage(confirmMessage, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);

    context.resourcesToDelete = resourcesToDelete.map(r => r.data);
    context.resourceList = resourceList;
    await node.deleteTreeItem(context);

}
