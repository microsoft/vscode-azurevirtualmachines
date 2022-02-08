/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { VirtualMachineTreeItem } from "../tree/VirtualMachineTreeItem";
import { createComputeClient } from "../utils/azureClients";
import { nonNullValue } from "../utils/nonNull";

export async function startVirtualMachine(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.allOSContextValue, context);
    }

    const computeClient: ComputeManagementClient = await createComputeClient([context, node]);

    await node.runWithTemporaryDescription(context, localize('starting', 'Starting...'), async () => {
        const vmti: VirtualMachineTreeItem = nonNullValue(node);
        ext.outputChannel.appendLog(localize('startingVm', `Starting "${vmti.name}"...`));
        await computeClient.virtualMachines.beginStartAndWait(vmti.resourceGroup, vmti.name);
        ext.outputChannel.appendLog(localize('startedVm', `"${vmti.name}" has been started.`));
    });

}
