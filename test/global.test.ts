/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TestOutputChannel } from 'vscode-azureextensiondev';
import { } from 'vscode-azureextensionui';
import { ext } from '../extension.bundle';

export let longRunningTestsEnabled: boolean;

// Runs before all tests
suiteSetup(async function (this: Mocha.Context): Promise<void> {
    this.timeout(120 * 1000);

    await vscode.commands.executeCommand('azureVirtualMachines.refresh'); // activate the extension before tests begin
    ext.outputChannel = new TestOutputChannel();

    longRunningTestsEnabled = !/^(false|0)?$/i.test(process.env.ENABLE_LONG_RUNNING_TESTS || '');
});

suiteTeardown(async function (this: Mocha.Context): Promise<void> {
    this.timeout(90 * 1000);
});

suite('suite1', () => {
    test('test1', () => {
        // suiteSetup only runs if a suite/test exists, so added a placeholder test here so we can at least verify the extension can activate
        // once actual tests exist, we can remove this
    });
});
