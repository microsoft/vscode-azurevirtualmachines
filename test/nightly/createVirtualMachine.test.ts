/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from "assert";
import { createTestActionContext, runWithTestActionContext } from "vscode-azureextensiondev";
import { AzExtLocation, createGenericClient, createVirtualMachineAdvanced, getAvailableVMLocations, getRandomHexString, getVirtualMachineSize, linuxImages, nonNullProp, windowsImages } from "../../extension.bundle";
import { longRunningTestsEnabled } from "../global.test";
import { getRotatingLocation } from "./getRotatingValue";
import { computeClient, resourceGroupsToDelete, testAccount } from "./global.resource.test";

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

suite("Create virtual machine", function (this: Mocha.Suite): void {

    this.timeout(6 * 60 * 1000);

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
    for (const os of ['Windows', 'Linux']) {
        for (const image of os === "Windows" ? windowsImages : linuxImages) {
            for (const passwordInput of os === "Windows" ? windowsPasswordInputs : linuxPasswordInputs)
                parallelTests.push({
                    title: `${os} - ${image.label} - ${passwordInput.title}`,
                    callback: async () => await testCreateVirtualMachine(os, image.label, passwordInput.input)
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


export async function getVMLocationInputs(): Promise<string[]> {
    const context = testAccount.getSubscriptionContext();
    const locationIds = await getAvailableVMLocations(computeClient, getVirtualMachineSize(context));

    // NOTE: Using a generic client because the subscriptions sdk is pretty far behind on api-version
    const client = await createGenericClient(await createTestActionContext(), context);
    const response = await client.sendRequest({
        method: 'GET',
        url: `/subscriptions/${context.subscriptionId}/locations?api-version=2019-11-01`
    });
    const allLocations = <AzExtLocation[]>response.parsedBody.value;

    return allLocations.filter((location) => locationIds.includes(location.name)).map((location) => location.displayName);
}

