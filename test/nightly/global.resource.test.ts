/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from '@azure/arm-compute';
import { ResourceManagementClient } from '@azure/arm-resources';
import { createTestActionContext, TestAzureAccount } from '@microsoft/vscode-azext-dev';
import * as vscode from 'vscode';
import { createAzureClient, createComputeClient, ISubscriptionContext } from '../../extension.bundle';
import { longRunningTestsEnabled } from '../global.test';

export let testAccount: TestAzureAccount;
export let computeClient: ComputeManagementClient;
export const resourceGroupsToDelete: string[] = [];

suiteSetup(async function (this: Mocha.Context): Promise<void> {
    this.skip();
    if (longRunningTestsEnabled) {
        this.timeout(20 * 60 * 1000);
        testAccount = new TestAzureAccount(vscode);
        await testAccount.signIn();

        computeClient = await createComputeClient([await createTestActionContext(), <ISubscriptionContext>testAccount.getSubscriptionContext()]);
    }
});

suiteTeardown(async function (this: Mocha.Context): Promise<void> {
    if (longRunningTestsEnabled) {
        this.timeout(10 * 60 * 1000);
        // ext.azureAccountTreeItem.dispose();
    }
});
