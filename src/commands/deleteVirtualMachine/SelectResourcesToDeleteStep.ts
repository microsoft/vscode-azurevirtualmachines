/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { AzureWizardPromptStep, IActionContext, IAzureQuickPickItem, nonNullProp, UserCancelledError } from "@microsoft/vscode-azext-utils";
import { virtualMachineLabel } from "../../constants";
import { localize } from "../../localize";
import { ResolvedVirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { createComputeClient } from "../../utils/azureClients";
import { IDeleteChildImplContext, ResourceToDelete } from "./deleteConstants";
import { getResourcesAssociatedToVm } from "./getResourcesAssociatedToVm";

export class SelectResourcesToDeleteStep extends AzureWizardPromptStep<IDeleteChildImplContext> {
    public async prompt(context: IDeleteChildImplContext): Promise<void> {
        const resourcesToDelete: IAzureQuickPickItem<ResourceToDelete>[] = await context.ui.showQuickPick(getQuickPicks(context, nonNullProp(context, 'node')), { placeHolder: localize('selectResources', 'Select resources to delete'), canPickMany: true });
        if (resourcesToDelete.length === 0) {
            // if nothing is checked, it should be considered a cancel
            throw new UserCancelledError();
        }

        context.resourcesToDelete = resourcesToDelete.map((r) => r.data);
    }

    public shouldPrompt(): boolean {
        return true;
    }
}

async function getQuickPicks(context: IActionContext, node: ResolvedVirtualMachineTreeItem): Promise<IAzureQuickPickItem<ResourceToDelete>[]> {
    const resources: ResourceToDelete[] = await getResourcesAssociatedToVm(context, node);

    // add the vm to the resources to delete since it is not an associated resource
    resources.unshift({
        resourceName: node.name, resourceType: virtualMachineLabel, picked: true,
        deleteMethod: async (): Promise<void> => {
            const computeClient: ComputeManagementClient = await createComputeClient([context, node?.subscription]);
            await computeClient.virtualMachines.beginDeleteAndWait(node.resourceGroup, node.name);
        }
    });

    return resources.map(resource => {
        return { label: resource.resourceName, description: resource.resourceType, data: resource, picked: resource.picked };
    });
}
