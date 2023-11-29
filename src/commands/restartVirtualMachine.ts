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

export async function restartVirtualMachine(context: IActionContext, node?: ResolvedVirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.rgApi.pickAppResource<ResolvedVirtualMachineTreeItem>(context, {
            filter: vmFilter,
        });
    }

    const computeClient: ComputeManagementClient = await createComputeClient([context, node?.subscription]);

    await node.runWithTemporaryDescription(context, localize('restarting', 'Restarting...'), async () => {
        const vmti: ResolvedVirtualMachineTreeItem = nonNullValue(node);
        ext.outputChannel.appendLog(localize('restartingVm', `Restarting "${vmti.name}"...`));
        await computeClient.virtualMachines.beginRestartAndWait(vmti.resourceGroup, vmti.name);
        ext.outputChannel.appendLog(localize('restartedVm', `"${vmti.name}" has been restarted.`));
    });

}
