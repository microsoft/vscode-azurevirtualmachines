/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { apiUtils, AzureExtensionApi, callWithTelemetryAndErrorHandling, createApiProvider, createAzExtOutputChannel, IActionContext, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import { AzureHostExtensionApi } from '@microsoft/vscode-azext-utils/hostapi';
import { AzExtResourceType } from '@microsoft/vscode-azureresources-api';
import * as vscode from 'vscode';
import { revealTreeItem } from './commands/api/revealTreeItem';
import { registerCommands } from './commands/registerCommands';
import { ext } from './extensionVariables';
import { VirtualMachineResolver } from './VirtualMachineTreeItemResolver';

export async function activateInternal(context: vscode.ExtensionContext, perfStats: { loadStartTime: number; loadEndTime: number }, ignoreBundle?: boolean): Promise<apiUtils.AzureExtensionApiProvider> {
    ext.context = context;
    ext.ignoreBundle = ignoreBundle;
    ext.outputChannel = createAzExtOutputChannel('Azure Virtual Machines', ext.prefix);
    context.subscriptions.push(ext.outputChannel);

    registerUIExtensionVariables(ext);
    registerAzureUtilsExtensionVariables(ext);

    await callWithTelemetryAndErrorHandling('azureVirtualMachines.activate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

        registerCommands();

        const rgApiProvider = await apiUtils.getExtensionExports<apiUtils.AzureExtensionApiProvider>('ms-azuretools.vscode-azureresourcegroups');
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
