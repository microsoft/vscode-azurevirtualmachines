/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TestOutputChannel, TestUserInput } from 'vscode-azureextensiondev';
import { } from 'vscode-azureextensionui';
import { ext, registerOnActionStartHandler } from '../extension.bundle';
import { createVmSuite } from './nightly/createVirtualMachine.test';

export let longRunningTestsEnabled: boolean;

// Runs before all tests
suite("Global suite", function (this: Mocha.Suite): void {
    suiteSetup(async function (this: Mocha.Context): Promise<void> {
        this.timeout(120 * 1000);

        await vscode.commands.executeCommand('azureVirtualMachines.refresh'); // activate the extension before tests begin
        ext.outputChannel = new TestOutputChannel();

        registerOnActionStartHandler(context => {
            // Use `TestUserInput` by default so we get an error if an unexpected call to `context.ui` occurs, rather than timing out
            context.ui = new TestUserInput(vscode);
        });

        longRunningTestsEnabled = !/^(false|0)?$/i.test(process.env.ENABLE_LONG_RUNNING_TESTS || '');
    });

    suiteTeardown(async function (this: Mocha.Context): Promise<void> {
        this.timeout(90 * 1000);
    });

    test('test', () => {
        if (!longRunningTestsEnabled) {
            createVmSuite.run();
        }
        // fake test to get the mocha tests running
    });
});
