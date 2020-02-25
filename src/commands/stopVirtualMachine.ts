/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import ComputeManagementClient from "azure-arm-compute";
import { createAzureClient, IActionContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { VirtualMachineTreeItem } from "../tree/VirtualMachineTreeItem";
import { nonNullValue } from "../utils/nonNull";

export async function stopVirtualMachine(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.contextValue, context);
    }

    const computeClient: ComputeManagementClient = createAzureClient(node.root, ComputeManagementClient);
    const deallocatingVm: string = localize('deallocatingVm', `Deallocating "${node.name}"...`);
    const deallocatedVm: string = localize('deallocatedVm', `"${node.name}" has been deallocated.`);

    await node.runWithTemporaryDescription(localize('deallocating', 'Deallocating...'), async () => {
        const vmti: VirtualMachineTreeItem = nonNullValue(node);
        ext.outputChannel.appendLog(deallocatingVm);
        await computeClient.virtualMachines.deallocate(vmti.resourceGroup, vmti.name);
        ext.outputChannel.appendLog(deallocatedVm);
    });

}
