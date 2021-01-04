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

export async function restartVirtualMachine(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.allOSContextValue, context);
    }

    const computeClient: ComputeManagementClient = await createComputeClient(node.root);

    await node.runWithTemporaryDescription(context, localize('restarting', 'Restarting...'), async () => {
        const vmti: VirtualMachineTreeItem = nonNullValue(node);
        ext.outputChannel.appendLog(localize('restartingVm', `Restarting "${vmti.name}"...`));
        await computeClient.virtualMachines.restart(vmti.resourceGroup, vmti.name);
        ext.outputChannel.appendLog(localize('restartedVm', `"${vmti.name}" has been restarted.`));
    });

}
