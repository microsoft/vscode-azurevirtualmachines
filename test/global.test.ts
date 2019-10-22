/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IHookCallbackContext } from 'mocha';
import * as vscode from 'vscode';
import { TestOutputChannel, TestUserInput } from 'vscode-azureextensiondev';
import { } from 'vscode-azureextensionui';
import { ext } from '../extension.bundle';

export let longRunningTestsEnabled: boolean;
export let testUserInput: TestUserInput = new TestUserInput(vscode);

// Runs before all tests
suiteSetup(async function (this: IHookCallbackContext): Promise<void> {
    this.timeout(120 * 1000);

    await vscode.commands.executeCommand('azureVirtualMachines.refresh'); // activate the extension before tests begin
    ext.outputChannel = new TestOutputChannel();
    ext.ui = testUserInput;

    // tslint:disable-next-line:strict-boolean-expressions
    longRunningTestsEnabled = !/^(false|0)?$/i.test(process.env.ENABLE_LONG_RUNNING_TESTS || '');

    // set AzureWebJobsStorage so that it doesn't prompt during tests
    process.env.AzureWebJobsStorage = 'ignore';
});

suiteTeardown(async function (this: IHookCallbackContext): Promise<void> {
    this.timeout(90 * 1000);
});
