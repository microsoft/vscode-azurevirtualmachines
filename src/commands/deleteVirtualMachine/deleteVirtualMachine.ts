/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { ResolvedVirtualMachineTreeItem, VirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { IDeleteChildImplContext } from "./deleteConstants";

export async function deleteVirtualMachine(context: IActionContext & Partial<IDeleteChildImplContext>, node?: ResolvedVirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.rgApi.tree.showTreeItemPicker<ResolvedVirtualMachineTreeItem>(new RegExp(VirtualMachineTreeItem.allOSContextValue), { ...context, suppressCreatePick: true });
    }
    // context.telemetry.properties.numOfResources = resourcesToDelete.length.toString();
    // context.telemetry.properties.deleteVm = String(context.deleteVm);

    await node.deleteTreeItem(context);
}
