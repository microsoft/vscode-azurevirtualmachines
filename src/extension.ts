/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { AzExtResourceType, callWithTelemetryAndErrorHandling, createApiProvider, createAzExtOutputChannel, getExtensionExports, IActionContext, registerCommand, registerCommandWithTreeNodeUnwrapping, registerErrorHandler, registerReportIssueCommand, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import { AzureExtensionApi, AzureExtensionApiProvider } from '@microsoft/vscode-azext-utils/api';
import { AzureHostExtensionApi } from '@microsoft/vscode-azext-utils/hostapi';
import * as vscode from 'vscode';
import { addSshKey } from './commands/addSshKey';
import { revealTreeItem } from './commands/api/revealTreeItem';
import { copyIpAddress } from './commands/copyIpAddress';
import { createVirtualMachine, createVirtualMachineAdvanced } from './commands/createVirtualMachine/createVirtualMachine';
import { deleteVirtualMachine } from './commands/deleteVirtualMachine/deleteVirtualMachine';
import { openInRemoteSsh } from './commands/openInRemoteSsh';
import { restartVirtualMachine } from './commands/restartVirtualMachine';
import { startVirtualMachine } from './commands/startVirtualMachine';
import { stopVirtualMachine } from './commands/stopVirtualMachine';
import { remoteSshExtensionId } from './constants';
import { ext } from './extensionVariables';
import { VirtualMachineResolver } from './VirtualMachineTreeItemResolver';

export async function activateInternal(context: vscode.ExtensionContext, perfStats: { loadStartTime: number; loadEndTime: number }, ignoreBundle?: boolean): Promise<AzureExtensionApiProvider> {
    ext.context = context;
    ext.ignoreBundle = ignoreBundle;
    ext.outputChannel = createAzExtOutputChannel('Azure Virtual Machines', ext.prefix);
    context.subscriptions.push(ext.outputChannel);

    registerUIExtensionVariables(ext);
    registerAzureUtilsExtensionVariables(ext);

    await callWithTelemetryAndErrorHandling('azureVirtualMachines.activate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.createVirtualMachine', createVirtualMachine);
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.createVirtualMachineAdvanced', createVirtualMachineAdvanced);
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.startVirtualMachine', startVirtualMachine);
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.restartVirtualMachine', restartVirtualMachine);
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.stopVirtualMachine', stopVirtualMachine);
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.addSshKey', addSshKey);
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.deleteVirtualMachine', deleteVirtualMachine);
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.copyIpAddress', copyIpAddress);
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.openInRemoteSsh', openInRemoteSsh);
        registerCommand('azureVirtualMachines.showOutputChannel', () => { ext.outputChannel.show(); });
        registerCommand('azureVirtualMachines.showRemoteSshExtension', () => { void vscode.commands.executeCommand('extension.open', remoteSshExtensionId); });

        // Suppress "Report an Issue" button for all errors in favor of the command
        registerErrorHandler(c => c.errorHandling.suppressReportIssue = true);
        registerReportIssueCommand('azureVirtualMachines.reportIssue');

        const rgApiProvider = await getExtensionExports<AzureExtensionApiProvider>('ms-azuretools.vscode-azureresourcegroups');
        if (rgApiProvider) {
            const api = rgApiProvider.getApi<AzureHostExtensionApi>('0.0.1');
            ext.rgApi = api;
            api.registerApplicationResourceResolver(AzExtResourceType.VirtualMachines, new VirtualMachineResolver());
        } else {
            throw new Error('Could not find the Azure Resource Groups extension');
        }
    });

    return createApiProvider([<AzureExtensionApi>{
        revealTreeItem,
        apiVersion: '1.0.0'
    }]);
}

export function deactivateInternal(): void {
    return;
}
