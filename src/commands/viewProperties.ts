/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';

export async function viewProperties(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.contextValue, context);
    }

    await openReadOnlyJson(node, node.data);
}
