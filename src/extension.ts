/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { AzExtTreeDataProvider, AzureTreeItem, AzureUserInput, callWithTelemetryAndErrorHandling, createApiProvider, createAzExtOutputChannel, createTelemetryReporter, IActionContext, registerCommand, registerUIExtensionVariables } from 'vscode-azureextensionui';
// tslint:disable-next-line:no-submodule-imports
import { AzureExtensionApiProvider } from 'vscode-azureextensionui/api';
import { createVirtualMachine } from './commands/createVirtualMachine/createVirtualMachine';
import { deleteNode } from './commands/deleteNode';
import { openInPortal } from './commands/openInPortal';
import { ext } from './extensionVariables';
import { AzureAccountTreeItem } from './tree/AzureAccountTreeItem';
import { SubscriptionTreeItem } from './tree/SubscriptionTreeItem';
import { VirtualMachineTreeItem } from './tree/VirtualMachineTreeItem';

export async function activateInternal(context: vscode.ExtensionContext, perfStats: { loadStartTime: number; loadEndTime: number }): Promise<AzureExtensionApiProvider> {
    ext.context = context;
    ext.reporter = createTelemetryReporter(context);
    ext.outputChannel = createAzExtOutputChannel('Azure Virtual Machines', ext.prefix);
    context.subscriptions.push(ext.outputChannel);
    ext.ui = new AzureUserInput(context.globalState);

    registerUIExtensionVariables(ext);

    await callWithTelemetryAndErrorHandling('azureVirtualMachines.activate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

        ext.azureAccountTreeItem = new AzureAccountTreeItem();
        context.subscriptions.push(ext.azureAccountTreeItem);
        ext.tree = new AzExtTreeDataProvider(ext.azureAccountTreeItem, 'azureVirtualMachines.loadMore');
        context.subscriptions.push(vscode.window.createTreeView('azVmTree', { treeDataProvider: ext.tree }));

        registerCommand('azureVirtualMachines.selectSubscriptions', () => vscode.commands.executeCommand('azure-account.selectSubscriptions'));
        registerCommand('azureVirtualMachines.refresh', async (_actionContext: IActionContext, node?: AzureTreeItem) => await ext.tree.refresh(node));
        registerCommand('azureVirtualMachines.loadMore', async (actionContext: IActionContext, node: AzureTreeItem) => await ext.tree.loadMore(node, actionContext));
        registerCommand('azureVirtualMachines.openInPortal', openInPortal);
        registerCommand('azureVirtualMachines.createVirtualMachine', async (actionContext: IActionContext, node?: SubscriptionTreeItem) => await createVirtualMachine(actionContext, node));
        registerCommand('azureVirtualMachines.deleteVirtualMachine', async (actionContext: IActionContext, node?: SubscriptionTreeItem) => await deleteNode(actionContext, VirtualMachineTreeItem.contextValue, node));
    });

    return createApiProvider([]);
}

// tslint:disable-next-line:no-empty
export function deactivateInternal(): void {
}
