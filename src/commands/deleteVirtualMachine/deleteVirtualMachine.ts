/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { type IActionContext } from "@microsoft/vscode-azext-utils";
import { vmFilter } from "../../constants";
import { ext } from "../../extensionVariables";
import { type ResolvedVirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { type IDeleteChildImplContext } from "./deleteConstants";

export async function deleteVirtualMachine(context: IActionContext & Partial<IDeleteChildImplContext>, node?: ResolvedVirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.rgApi.pickAppResource<ResolvedVirtualMachineTreeItem>({ ...context, suppressCreatePick: true }, {
            filter: vmFilter,
        });
    }
    // context.telemetry.properties.numOfResources = resourcesToDelete.length.toString();
    // context.telemetry.properties.deleteVm = String(context.deleteVm);

    await node.deleteTreeItem(context);
}
