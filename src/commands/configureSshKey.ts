/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from "azure-arm-compute";
import * as fse from "fs-extra";
import { basename } from 'path';
import { ProgressLocation, Uri, window } from "vscode";
import { createAzureClient, IActionContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { VirtualMachineTreeItem } from "../tree/VirtualMachineTreeItem";
import { nonNullValueAndProp } from "../utils/nonNull";
import { configureSshConfig, sshFsPath } from "../utils/sshUtils";

export async function configureSshKey(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.contextValue, context);
    }

    const computeClient: ComputeManagementClient = createAzureClient(node.root, ComputeManagementClient);
    const vm: ComputeManagementModels.VirtualMachine = await computeClient.virtualMachines.get(node.resourceGroup, node.name);

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
        vmExtension = { location: vm.location, publisher: 'Microsoft.OSTCExtensions', virtualMachineExtensionType: 'VMAccessForLinux', type: 'Microsoft.Compute/virtualMachines/extensions', typeHandlerVersion: '1.4', autoUpgradeMinorVersion: true };
        vmExtension.protectedSettings = {
            ssh_key: (await fse.readFile(sshPublicKey.fsPath)).toString(),
            // tslint:disable-next-line: strict-boolean-expressions
            username: vm.osProfile && vm.osProfile.adminUsername || 'azureuser'
        };
    }

    const configuringSsh: string = localize('ConfiguringSsh', 'Configuring virtual machine "{0}" with SSH Public Key "{1}"...', node.name, sshPublicKey.fsPath);
    const configuringSshSucceeded: string = localize('ConfiguringSshSucceeded', 'Successfully configured "{0}".', node.name);

    await window.withProgress({ location: ProgressLocation.Notification, title: configuringSsh }, async (): Promise<void> => {
        ext.outputChannel.appendLog(configuringSsh);
        await computeClient.virtualMachineExtensions.createOrUpdate(nonNullValueAndProp(node, 'resourceGroup'), nonNullValueAndProp(node, 'name'), extensionName, vmExtension);
        window.showInformationMessage(configuringSshSucceeded);
        ext.outputChannel.appendLog(configuringSshSucceeded);
    });

    await configureSshConfig(node, basename(sshPublicKey.fsPath));
}
