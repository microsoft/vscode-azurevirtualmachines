/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from "@azure/arm-compute";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { ResolvedVirtualMachineTreeItem, VirtualMachineTreeItem } from "../tree/VirtualMachineTreeItem";
import { createComputeClient } from "../utils/azureClients";
import { nonNullValue } from "../utils/nonNull";

export async function restartVirtualMachine(context: IActionContext, node?: ResolvedVirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.rgApi.tree.showTreeItemPicker<ResolvedVirtualMachineTreeItem>(new RegExp(VirtualMachineTreeItem.allOSContextValue), context);
    }

    const computeClient: ComputeManagementClient = await createComputeClient([context, node?.subscription]);

    await node.runWithTemporaryDescription(context, localize('restarting', 'Restarting...'), async () => {
        const vmti: ResolvedVirtualMachineTreeItem = nonNullValue(node);
        ext.outputChannel.appendLog(localize('restartingVm', `Restarting "${vmti.name}"...`));
        await computeClient.virtualMachines.beginRestartAndWait(vmti.resourceGroup, vmti.name);
        ext.outputChannel.appendLog(localize('restartedVm', `"${vmti.name}" has been restarted.`));
    });

}
