/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { } from '@microsoft/vscode-azext-azureutils';
import { TestOutputChannel, TestUserInput } from '@microsoft/vscode-azext-dev';
import { } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext, registerOnActionStartHandler } from '../extension.bundle';

export let longRunningTestsEnabled: boolean;

// Runs before all tests
suiteSetup(async function (this: Mocha.Context): Promise<void> {
    this.timeout(120 * 1000);

    await vscode.commands.executeCommand('azureVirtualMachines.refresh'); // activate the extension before tests begin
    ext.outputChannel = new TestOutputChannel();

    registerOnActionStartHandler(context => {
        // Use `TestUserInput` by default so we get an error if an unexpected call to `context.ui` occurs, rather than timing out
        context.ui = new TestUserInput(vscode);
    });

    longRunningTestsEnabled = true //!/^(false|0)?$/i.test(process.env.ENABLE_LONG_RUNNING_TESTS || '');
});

suiteTeardown(async function (this: Mocha.Context): Promise<void> {
    this.timeout(90 * 1000);
});
