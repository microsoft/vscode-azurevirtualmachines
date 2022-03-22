/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, ICreateChildImplContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { SubscriptionTreeItem } from '../../tree/SubscriptionTreeItem';
import { ResolvedVirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";

export async function createVirtualMachine(context: IActionContext & Partial<ICreateChildImplContext>, node?: SubscriptionTreeItem | undefined): Promise<ResolvedVirtualMachineTreeItem> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<SubscriptionTreeItem>(SubscriptionTreeItem.contextValue, context);
    }

    return await node.createChild(context);
}

export async function createVirtualMachineAdvanced(context: IActionContext, node?: SubscriptionTreeItem | undefined): Promise<ResolvedVirtualMachineTreeItem> {
    return await createVirtualMachine({ ...context, advancedCreation: true }, node);
}
