/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from '@azure/arm-compute';
import { ResourceManagementClient } from '@azure/arm-resources';
import * as vscode from 'vscode';
import { createTestActionContext, TestAzureAccount } from 'vscode-azureextensiondev';
import { AzExtTreeDataProvider, AzureAccountTreeItem, createAzureClient, createComputeClient, ext, ISubscriptionContext } from '../../extension.bundle';
import { longRunningTestsEnabled } from '../global.test';

export let testAccount: TestAzureAccount;
export let computeClient: ComputeManagementClient;
export const resourceGroupsToDelete: string[] = [];
export let locations: string[];

suiteSetup(async function (this: Mocha.Context): Promise<void> {
    if (longRunningTestsEnabled) {
        this.timeout(20 * 60 * 1000);
        testAccount = new TestAzureAccount(vscode);
        await testAccount.signIn();
        ext.azureAccountTreeItem = new AzureAccountTreeItem(testAccount);
        ext.tree = new AzExtTreeDataProvider(ext.azureAccountTreeItem, 'azureDatabases.loadMore');
        computeClient = await createComputeClient([await createTestActionContext(), <ISubscriptionContext>testAccount.getSubscriptionContext()]);
    }
});

suiteTeardown(async function (this: Mocha.Context): Promise<void> {
    if (longRunningTestsEnabled) {
        this.timeout(10 * 60 * 1000);
        await deleteResourceGroups();
        ext.azureAccountTreeItem.dispose();
    }
});

async function deleteResourceGroups(): Promise<void> {
    const rgClient: ResourceManagementClient = createAzureClient([await createTestActionContext(), testAccount.getSubscriptionContext()], ResourceManagementClient);
    await Promise.all(resourceGroupsToDelete.map(async resourceGroup => {
        if ((await rgClient.resourceGroups.checkExistence(resourceGroup)).body) {
            console.log(`Started deleting resource group "${resourceGroup}"...`);
            await rgClient.resourceGroups.beginDeleteMethod(resourceGroup);
            console.log(`Successfully deleted resource group "${resourceGroup}".`);
        } else {
            // If the test failed, the resource group might not actually exist
            console.log(`Ignoring resource group "${resourceGroup}" because it does not exist.`);
        }
    }));
}