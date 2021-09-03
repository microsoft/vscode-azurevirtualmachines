/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementModels } from "@azure/arm-compute";
import * as assert from "assert";
import { createTestActionContext, runWithTestActionContext } from "vscode-azureextensiondev";
import { createVirtualMachineAdvanced, getRandomHexString, ImageListStep, nonNullProp } from "../../extension.bundle";
import { longRunningTestsEnabled } from "../global.test";
import { getRotatingLocation } from "./getRotatingValue";
import { computeClient, resourceGroupsToDelete } from "./global.resource.test";

/**
 * NOTE: We have to setup the test before suiteSetup, but we can't start the test until suiteSetup. That's why we have separate callback/task properties
 */
interface IParallelTest {
    title: string;
    task?: Promise<void>;
    callback(): Promise<void>;
}

interface IPasswordInput {
    title: string;
    input: string[];
}

suite("Create virtual machine", async function (this: Mocha.Suite): Promise<void> {

    this.timeout(8 * 60 * 1000);

    const password = "password123!";
    const standardPasswordInput: IPasswordInput = {
        title: "standard password",
        input: [password, password]
    }

    const windowsPasswordInputs: IPasswordInput[] = [standardPasswordInput];
    const linuxPasswordInputs: IPasswordInput[] = [standardPasswordInput, {
        title: 'no password',
        input: [""]
    }];


    const parallelTests: IParallelTest[] = [];
    const oss: ComputeManagementModels.OperatingSystemType[] = ['Linux', 'Windows'];

    for (const os of oss) {
        const context = await createTestActionContext();
        const images = await new ImageListStep().getFeaturedImages(context, os);
        for (const image of images) {
            for (const passwordInput of os === "Windows" ? windowsPasswordInputs : linuxPasswordInputs)
                parallelTests.push({
                    title: `${os} - ${image.displayName} - ${passwordInput.title}`,
                    callback: async () => await testCreateVirtualMachine(os, image.displayName, passwordInput.input)
                });
        }
    }

    suiteSetup(function (this: Mocha.Context): void {
        if (!longRunningTestsEnabled) {
            this.skip();
        }

        for (const t of parallelTests) {
            t.task = t.callback();
        }
    });

    for (const t of parallelTests) {
        test(t.title, async () => {
            await nonNullProp(t, 'task');
        });
    }

    async function testCreateVirtualMachine(os: string, image: string, passwordInputs: string[]): Promise<void> {
        const resourceName: string = `vm-${getRandomHexString()}`; // append vm- to ensure name isn't only numbers
        const location = getRotatingLocation();

        const testInputs: (string | RegExp)[] = [
            resourceName,
            os,
            image,
            "username",
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
        assert.notStrictEqual(resourceGroup, '');
        if (resourceGroup !== '') {
            resourceGroupsToDelete.push(resourceGroup);

            assert.strictEqual(true, true);

            const virtualMachine = await computeClient.virtualMachines.get(resourceGroup, resourceName);
            assert.strictEqual(virtualMachine.name, resourceName);
            assert.strictEqual(virtualMachine.osProfile?.adminUsername, "username");
        }
    }
});
