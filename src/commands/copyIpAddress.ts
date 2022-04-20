/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { ResolvedVirtualMachineTreeItem, VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';

export async function copyIpAddress(context: IActionContext, node?: ResolvedVirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<ResolvedVirtualMachineTreeItem>(VirtualMachineTreeItem.allOSContextValue, context);
    }

    if (!node) {
        return;
    }

    await vscode.env.clipboard.writeText(await node.getIpAddress(context));
    const message: string = localize('copiedIpAddress', '"{0}"\'s IP address has been copied to the clipboard', node.name);
    void vscode.window.showInformationMessage(message);
}
