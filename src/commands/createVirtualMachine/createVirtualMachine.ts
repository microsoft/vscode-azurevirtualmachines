/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, ICreateChildImplContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { SubscriptionTreeItem } from '../../tree/SubscriptionTreeItem';

export async function createVirtualMachine(context: IActionContext & Partial<ICreateChildImplContext>, node?: SubscriptionTreeItem | undefined): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<SubscriptionTreeItem>(SubscriptionTreeItem.contextValue, context);
    }

    await node.createChild(context);
}

export async function createVirtualMachineAdvanced(context: IActionContext, node?: SubscriptionTreeItem | undefined): Promise<void> {
    await createVirtualMachine({ ...context, advancedCreation: true }, node);
}
