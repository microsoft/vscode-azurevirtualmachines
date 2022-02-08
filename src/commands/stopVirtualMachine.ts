/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { VirtualMachineTreeItem } from "../tree/VirtualMachineTreeItem";
import { createComputeClient } from "../utils/azureClients";
import { nonNullValue } from "../utils/nonNull";

export async function stopVirtualMachine(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.allOSContextValue, context);
    }

    const computeClient: ComputeManagementClient = await createComputeClient([context, node]);

    await node.runWithTemporaryDescription(context, localize('deallocating', 'Deallocating...'), async () => {
        const vmti: VirtualMachineTreeItem = nonNullValue(node);
        ext.outputChannel.appendLog(localize('deallocatingVm', `Deallocating "${vmti.name}"...`));
        await computeClient.virtualMachines.beginDeallocateAndWait(vmti.resourceGroup, vmti.name);
        ext.outputChannel.appendLog(localize('deallocatedVm', `"${vmti.name}" has been deallocated.`));
    });

}
