/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { callWithTelemetryAndErrorHandling, createApiProvider, createAzExtOutputChannel, getResourceGroupsApi, IActionContext, registerCommandWithTreeNodeUnwrapping, registerErrorHandler, registerReportIssueCommand, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import { AzureExtensionApi, AzureExtensionApiProvider } from '@microsoft/vscode-azext-utils/api';
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
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.showOutputChannel', () => { ext.outputChannel.show(); });
        registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.showRemoteSshExtension', () => { void vscode.commands.executeCommand('extension.open', remoteSshExtensionId); });

        // Suppress "Report an Issue" button for all errors in favor of the command
        registerErrorHandler(c => c.errorHandling.suppressReportIssue = true);
        registerReportIssueCommand('azureVirtualMachines.reportIssue');

        ext.rgApi = await getResourceGroupsApi('0.0.1');
        ext.v2RgApi = await getResourceGroupsApi('2.0.0');
    });

    return createApiProvider([<AzureExtensionApi>{
        revealTreeItem,
        apiVersion: '1.0.0'
    }]);
}

export function deactivateInternal(): void {
    return;
}
