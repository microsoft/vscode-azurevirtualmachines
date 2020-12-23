/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';
import { verifyRemoteSshExtension } from './verifyRemoteSshExtension';

export async function openInRemoteSsh(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.contextValue, context);
    }

    await verifyRemoteSshExtension(context);
    await commands.executeCommand('opensshremotes.openEmptyWindow', { host: node.name });
}
