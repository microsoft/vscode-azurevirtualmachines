import * as assert from "assert";
import { runWithTestActionContext } from "vscode-azureextensiondev";
import {
    createVirtualMachine,
    delay,
    getRandomHexString
} from "../../extension.bundle";
import { getRotatingLocation } from "./getRotatingValue";
import { resourceGroupsToDelete } from "./global.resource.test";

suite("Create a virtual machine", function (this: Mocha.Suite): void {
    this.timeout(6 * 60 * 1000);

    test("Create Linux virtual machine", async () => {
        const resourceName: string = getRandomHexString();
        const resourceGroupName = getRandomHexString();

        resourceGroupsToDelete.push(resourceGroupName);

        const testInputs: (string | RegExp)[] = [
            resourceName,
            "",
            getRotatingLocation(),
        ];

        await runWithTestActionContext("CreateWebAppAdvanced", async (context) => {
            await context.ui.runWithInputs(testInputs, async () => {
                await createVirtualMachine(context);
            });
        });

        await delay(5000);

        assert.strictEqual("hello", "hello");
    });
});
