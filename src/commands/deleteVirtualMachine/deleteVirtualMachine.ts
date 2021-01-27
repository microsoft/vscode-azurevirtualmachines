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
import { nonNullValue } from "../../utils/nonNull";
import { IDeleteChildImplContext, ResourceToDelete, virtualMachineLabel } from "./deleteConstants";
import { getResourcesAssociatedToVm } from "./getResourcesAssociatedToVm";
import { promptResourcesToDelete } from "./promptResourcesToDelete";

export async function deleteVirtualMachine(context: IActionContext & Partial<IDeleteChildImplContext>, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.allOSContextValue, context);
    }

    const resourcesP: Promise<ResourceToDelete[]> = new Promise<ResourceToDelete[]>(async (resolve, _reject): Promise<void> => {
        const vmNode: VirtualMachineTreeItem = nonNullValue(node);
        const associatedResources: ResourceToDelete[] = await getResourcesAssociatedToVm(vmNode);
        const computeClient: ComputeManagementClient = await createComputeClient(vmNode.root);

        // add the vm to the resources to delete since it is not an associated resource
        associatedResources.unshift({
            resourceName: vmNode.name, resourceType: virtualMachineLabel, picked: true,
            deleteMethod: async (): Promise<void> => { await computeClient.virtualMachines.deleteMethod(vmNode.resourceGroup, vmNode.name); }
        });

        resolve(associatedResources);
    });

    context.telemetry.properties.cancelStep = 'prompt';
    const resourcesToDelete: IAzureQuickPickItem<ResourceToDelete>[] = await promptResourcesToDelete(resourcesP);
    const multiDelete: boolean = resourcesToDelete.length > 1;

    const resourceList: string = resourcesToDelete.map(r => `"${r.data.resourceName}"`).join(', ');
    const confirmMessage: string = multiDelete ? localize('multiDeleteConfirmation', 'Are you sure you want to delete the following resources: {0}?', resourceList) :
        localize('deleteConfirmation', 'Are you sure you want to delete {0} "{1}"?', resourcesToDelete[0].data.resourceType, resourcesToDelete[0].data.resourceName);

    context.telemetry.properties.cancelStep = 'confirmation';
    await ext.ui.showWarningMessage(confirmMessage, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);

    context.telemetry.properties.numOfResources = resourcesToDelete.length.toString();
    context.telemetry.properties.deleteVm = String(resourcesToDelete.some(v => v.data.resourceType === virtualMachineLabel));

    context.resourcesToDelete = resourcesToDelete.map(r => r.data);
    context.resourceList = resourceList;

    await node.deleteTreeItem(context);

}
