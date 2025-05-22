/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperatingSystemType } from "@azure/arm-compute";
import { createTestActionContext, runWithTestActionContext, TestActionContext } from "@microsoft/vscode-azext-dev";
import * as assert from "assert";
import { createSubscriptionContext, createVirtualMachine, createVirtualMachineAdvanced, ext, getRandomHexString, ImageListStep, ISubscriptionActionContext, subscriptionExperience } from "../../extension.bundle";
import { longRunningTestsEnabled } from "../global.test";
import { getRotatingLocation } from "./getRotatingValue";
import { computeClient, resourceGroupsToDelete } from "./global.resource.test";

interface IPasswordInput {
    title: string;
    input: string[];
}

const username: string = 'azureuser';
let password: string;
let standardPasswordInput: IPasswordInput;

suite("Create virtual machine", function (this: Mocha.Suite) {
    // creating VMs can take a pretty long time, seems to be pretty variable
    this.timeout(45 * 60 * 1000);

    suiteSetup(function (this: Mocha.Context): void {
        if (!longRunningTestsEnabled) {
            this.skip();
        }

        password = `AzVm-${getRandomHexString(10)}123!`;
        standardPasswordInput = {
            title: "standard password",
            input: [password, password]
        }
    });

    test('Basic Create', async () => {
        const location = getRotatingLocation();
        const resourceName: string = `vm-${getRandomHexString()}`;
        const testInputs: (string | RegExp)[] = [
            resourceName,
            "",
            location
        ];

        await runWithTestActionContext("CreateVirtualMachine", async (context) => {
            await context.ui.runWithInputs(testInputs, async () => {
                const vmNode = await createVirtualMachine(context);
                await verifyVmCreated(vmNode.resourceGroup, resourceName)
            });
        });
    });

    test('Advanced Create - Linux', async () => {
        const linuxPasswordInputs: IPasswordInput[] = [standardPasswordInput, {
            title: 'no password',
            input: [""]
        }];

        const parallelTests: Promise<void>[] = await createVmTestsByOs('Linux', linuxPasswordInputs);
        await Promise.all(parallelTests);
    });

    test('Advanced Create - Windows', async () => {
        const windowsPasswordInputs: IPasswordInput[] = [standardPasswordInput];

        const parallelTests: Promise<void>[] = await createVmTestsByOs('Windows', windowsPasswordInputs);
        await Promise.all(parallelTests);
    });
});

async function testCreateVirtualMachine(os: string, image: string, passwordInputs: string[]): Promise<void> {
    const resourceName: string = `vm-${getRandomHexString()}`; // append vm- to ensure name isn't only numbers
    const location = getRotatingLocation();

    const testInputs: (string | RegExp)[] = [
        resourceName,
        os,
        image,
        username,
        ...passwordInputs,
        location
    ];

    let resourceGroup = '';

    await runWithTestActionContext("CreateVirtualMachineAdvanced", async (context) => {
        await context.ui.runWithInputs(testInputs, async () => {
            const vmNode = await createVirtualMachineAdvanced(context);
            resourceGroup = vmNode.resourceGroup;
        });
    });

    await verifyVmCreated(resourceGroup, resourceName);
}

async function createVmTestsByOs(os: OperatingSystemType, passwordInputs: IPasswordInput[]): Promise<Promise<void>[]> {
    const parallelTests: Promise<void>[] = [];
    const testActionContext: TestActionContext = await createTestActionContext();
    const context: ISubscriptionActionContext = {
        ...testActionContext,
        ...createSubscriptionContext(await subscriptionExperience(testActionContext, ext.rgApi.appResourceTree)),
    };

    const images = await new ImageListStep().getQuickPicks(context, os);

    let count = 0;
    for (const image of images) {
        for (const passwordInput of passwordInputs) {
            count++;

            parallelTests.push(
                new Promise((res, rej) => {
                    const title: string = `${os} - ${image.label} - ${passwordInput.title}`;
                    console.log(`${count}. ${title}`);
                    testCreateVirtualMachine(os, image.label, passwordInput.input)
                        .then(() => res())
                        .catch((err) => {
                            console.error(`Failed: ${title}`);
                            rej(err);
                        });
                })
            );
        }
    }

    return parallelTests;

}

async function verifyVmCreated(resourceGroup: string, resourceName: string): Promise<void> {
    assert.notStrictEqual(resourceGroup, '');
    if (resourceGroup !== '') {
        resourceGroupsToDelete.push(resourceGroup);

        assert.strictEqual(true, true);

        const virtualMachine = await computeClient.virtualMachines.get(resourceGroup, resourceName);
        assert.strictEqual(virtualMachine.name, resourceName);
        assert.strictEqual(virtualMachine.osProfile?.adminUsername, username);
    }
}
