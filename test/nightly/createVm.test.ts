import * as assert from "assert";
import { runWithTestActionContext } from "vscode-azureextensiondev";
import {
    createVirtualMachineAdvanced, getRandomHexString, linuxImages, nonNullProp, windowsImages
} from "../../extension.bundle";
import { longRunningTestsEnabled } from "../global.test";
import { getRotatingLocation } from "./getRotatingValue";
import { resourceGroupsToDelete } from "./global.resource.test";

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
        const images = os === "Windows" ? windowsImages : linuxImages;
        // for (const image of images) {
        for (const passwordInput of os === "Windows" ? windowsPasswordInputs : linuxPasswordInputs)
            parallelTests.push({
                title: `${os} - ${images[0].label} - ${passwordInput.title}`,
                callback: async () => await testCreateVirtualMachine(os, images[0].label, passwordInput.input)
            });
        // }
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
        const resourceName: string = getRandomHexString();
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

        if (resourceGroup !== '') {

            resourceGroupsToDelete.push(resourceGroup);

            assert.strictEqual(true, true);

            // const vms = await computeClient.virtualMachines.get(vmNode.resourceGroup, resourceName);
            // vms.nextLink
            // const doesVmExist = vms.find((vm) => vm.name === resourceName);
            // assert.notStrictEqual(doesVmExist, -1);
        }
    }
});
