/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from '@azure/arm-compute';
import { ResourceManagementClient } from '@azure/arm-resources';
import * as vscode from 'vscode';
import { createTestActionContext, TestAzureAccount } from 'vscode-azureextensiondev';
import { AzExtLocation, AzExtTreeDataProvider, AzureAccountTreeItem, createComputeClient, createGenericClient, createResourceClient, ext, getAvailableVMLocations, getVirtualMachineSize, ISubscriptionContext } from '../../extension.bundle';
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
        const locationIds = await getAvailableVMLocations(computeClient, getVirtualMachineSize(testAccount.getSubscriptionContext()));
        // NOTE: Using a generic client because the subscriptions sdk is pretty far behind on api-version
        const client = await createGenericClient(await createTestActionContext(), testAccount.getSubscriptionContext());
        const response = await client.sendRequest({
            method: 'GET',
            url: `/subscriptions/${testAccount.getSubscriptionContext().subscriptionId}/locations?api-version=2019-11-01`
        });
        const allLocations = <AzExtLocation[]>response.parsedBody.value;
        locations = allLocations.filter((location) => locationIds.includes(location.name)).map((location) => location.displayName);
    }
});

suiteTeardown(async function (this: Mocha.Context): Promise<void> {
    if (longRunningTestsEnabled) {
        this.timeout(10 * 60 * 1000);
        await Promise.all(resourceGroupsToDelete.map(async resource => {
            await beginDeleteResourceGroup(resource);
        }));
        ext.azureAccountTreeItem.dispose();
    }
});

export async function beginDeleteResourceGroup(resourceGroup: string): Promise<void> {
    const client: ResourceManagementClient = await createResourceClient([await createTestActionContext(), <ISubscriptionContext>testAccount.getSubscriptionContext()]);
    if ((await client.resourceGroups.checkExistence(resourceGroup)).body) {
        console.log(`Started deleting resource group "${resourceGroup}"...`);
        await client.resourceGroups.beginDeleteMethod(resourceGroup);
        console.log(`Successfully deleted resource group "${resourceGroup}".`);
    } else {
        // If the test failed, the resource group might not actually exist
        console.log(`Ignoring resource group "${resourceGroup}" because it does not exist.`);
    }
}
