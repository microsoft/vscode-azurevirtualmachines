/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { type ComputeManagementClient } from "@azure/arm-compute";
import { nonNullValue, type IActionContext } from "@microsoft/vscode-azext-utils";
import { vmFilter } from "../constants";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { type ResolvedVirtualMachineTreeItem } from "../tree/VirtualMachineTreeItem";
import { createComputeClient } from "../utils/azureClients";

export async function stopVirtualMachine(context: IActionContext, node?: ResolvedVirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.rgApi.pickAppResource<ResolvedVirtualMachineTreeItem>(context, {
            filter: vmFilter,
        });
    }

    const computeClient: ComputeManagementClient = await createComputeClient([context, node?.subscription]);

    await node.runWithTemporaryDescription(context, localize('deallocating', 'Deallocating...'), async () => {
        const vmti: ResolvedVirtualMachineTreeItem = nonNullValue(node);
        ext.outputChannel.appendLog(localize('deallocatingVm', `Deallocating "${vmti.name}"...`));
        await computeClient.virtualMachines.beginDeallocateAndWait(vmti.resourceGroup, vmti.name);
        ext.outputChannel.appendLog(localize('deallocatedVm', `"${vmti.name}" has been deallocated.`));
    });

}
