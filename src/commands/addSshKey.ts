/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from "@azure/arm-compute";
import * as fse from "fs-extra";
import { ProgressLocation, Uri, window } from "vscode";
import { createAzureClient, IActionContext, parseError } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { VirtualMachineTreeItem } from "../tree/VirtualMachineTreeItem";
import { nonNullValueAndProp } from "../utils/nonNull";
import { configureSshConfig, sshFsPath } from "../utils/sshUtils";

export async function addSshKey(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.contextValue, context);
    }

    const computeClient: ComputeManagementClient = createAzureClient(node.root, ComputeManagementClient);
    const vm: ComputeManagementModels.VirtualMachine = node.virtualMachine;

    if (!node.isLinux) {
        throw new Error(localize('notSupportedWindows', 'This operation is not supported on Windows VMs.'));
    }

    const sshPublicKey: Uri = (await ext.ui.showOpenDialog({
        defaultUri: Uri.parse(sshFsPath),
        filters: { 'SSH Public Key': ['pub'] }
    }))[0];

    // tslint:disable-next-line: strict-boolean-expressions
    const extensionName: string = 'enablevmaccess';
    let vmExtension: ComputeManagementModels.VirtualMachineExtension;

    try {
        // the VMAccessForLinux extension is necessary to configure more SSH keys
        vmExtension = await computeClient.virtualMachineExtensions.get(node.resourceGroup, node.name, extensionName);
    } catch (e) {
        if (parseError(e).errorType !== 'ResourceNotFound') {
            throw e;
        }

        vmExtension = { location: vm.location, publisher: 'Microsoft.OSTCExtensions', virtualMachineExtensionType: 'VMAccessForLinux', type: 'Microsoft.Compute/virtualMachines/extensions', typeHandlerVersion: '1.4', autoUpgradeMinorVersion: true };
    }

    vmExtension.protectedSettings = {
        ssh_key: (await fse.readFile(sshPublicKey.fsPath)).toString(),
        // tslint:disable-next-line: strict-boolean-expressions
        username: vm.osProfile && vm.osProfile.adminUsername || 'azureuser'
    };

    const addingSshKey: string = localize('addingSshKey', 'Adding SSH Public Key "{0}" to Azure VM "{1}" ...', sshPublicKey.fsPath, node.name);
    const addingSshKeySucceeded: string = localize('addingSshKeySucceeded', 'Successfully added key to "{0}".', node.name);

    await window.withProgress({ location: ProgressLocation.Notification, title: addingSshKey }, async (): Promise<void> => {
        ext.outputChannel.appendLog(addingSshKey);
        await computeClient.virtualMachineExtensions.createOrUpdate(nonNullValueAndProp(node, 'resourceGroup'), nonNullValueAndProp(node, 'name'), extensionName, vmExtension);
        window.showInformationMessage(addingSshKeySucceeded);
        ext.outputChannel.appendLog(addingSshKeySucceeded);
    });

    // the ssh/config file lists the private key, not the .pub file, so remove the ext from the file path
    await configureSshConfig(node, sshPublicKey.path.substring(0, sshPublicKey.path.length - 4));
}
