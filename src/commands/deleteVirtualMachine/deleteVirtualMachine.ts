/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { DialogResponses, IActionContext, IAzureQuickPickItem, UserCancelledError } from "vscode-azureextensionui";
import { virtualMachineLabel } from "../../constants";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { VirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { createComputeClient } from "../../utils/azureClients";
import { IDeleteChildImplContext, ResourceToDelete } from "./deleteConstants";
import { getResourcesAssociatedToVm } from "./getResourcesAssociatedToVm";

export async function deleteVirtualMachine(context: IActionContext & Partial<IDeleteChildImplContext>, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.allOSContextValue, { ...context, suppressCreatePick: true });
    }

    context.telemetry.properties.cancelStep = 'prompt';
    const resourcesToDelete: IAzureQuickPickItem<ResourceToDelete>[] = await context.ui.showQuickPick(getQuickPicks(node), { placeHolder: localize('selectResources', 'Select resources to delete'), canPickMany: true });
    if (resourcesToDelete.length === 0) {
        // if nothing is checked, it should be considered a cancel
        throw new UserCancelledError();
    }

    context.telemetry.properties.cancelStep = undefined;

    const multiDelete: boolean = resourcesToDelete.length > 1;
    const resourceList: string = resourcesToDelete.map(r => `"${r.data.resourceName}"`).join(', ');
    const confirmMessage: string = multiDelete ? localize('multiDeleteConfirmation', 'Are you sure you want to delete the following resources: {0}?', resourceList) :
        localize('deleteConfirmation', 'Are you sure you want to delete {0} "{1}"?', resourcesToDelete[0].data.resourceType, resourcesToDelete[0].data.resourceName);

    context.telemetry.properties.cancelStep = 'confirmation';
    await context.ui.showWarningMessage(confirmMessage, { modal: true }, DialogResponses.deleteResponse);
    context.deleteVm = resourcesToDelete.some(v => v.data.resourceType === virtualMachineLabel);

    context.telemetry.properties.cancelStep = undefined;

    context.telemetry.properties.numOfResources = resourcesToDelete.length.toString();
    context.telemetry.properties.deleteVm = String(context.deleteVm);

    context.resourcesToDelete = resourcesToDelete.map(r => r.data);
    context.resourceList = resourceList;

    await node.deleteTreeItem(context);

}

async function getQuickPicks(node: VirtualMachineTreeItem): Promise<IAzureQuickPickItem<ResourceToDelete>[]> {
    const resources: ResourceToDelete[] = await getResourcesAssociatedToVm(node);

    // add the vm to the resources to delete since it is not an associated resource
    resources.unshift({
        resourceName: node.name, resourceType: virtualMachineLabel, picked: true,
        deleteMethod: async (): Promise<void> => {
            const computeClient: ComputeManagementClient = await createComputeClient(node.root);
            await computeClient.virtualMachines.deleteMethod(node.resourceGroup, node.name);
        }
    });

    return resources.map(resource => {
        return { label: resource.resourceName, description: resource.resourceType, data: resource, picked: resource.picked };
    });
}
