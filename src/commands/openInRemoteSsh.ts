/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { join } from 'path';
// tslint:disable-next-line:no-require-imports
import SSHConfig = require('ssh-config');
import { commands } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';
import { sshFsPath } from '../utils/sshUtils';
import { addSshKey } from './addSshKey';
import { verifyRemoteSshExtension } from './verifyRemoteSshExtension';

export async function openInRemoteSsh(context: IActionContext, node?: VirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.contextValue, context);
    }

    if (!node.isLinux) {
        throw new Error(localize('notSupportedWindows', 'This operation is not supported on Windows VMs.'));
    }

    await verifyRemoteSshExtension(context);

    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.ensureFile(sshConfigPath);
    const configFile: string = (await fse.readFile(sshConfigPath)).toString();
    // tslint:disable: no-unsafe-any
    const sshConfig: SSHConfig = SSHConfig.parse(configFile);
    const hostName: string = await node.getIpAddress();
    if (!sshConfig.find(line => line.param === 'HostName' && line.value === hostName)) {
        // tslint:enable: no-unsafe-any
        await ext.ui.showWarningMessage(localize('unableFind', 'Unable to find "{0}" in SSH config.', node.data.name), { title: localize('addSSH', 'Add new SSH config host') });
        await addSshKey(context, node);
    }

    await commands.executeCommand('opensshremotes.openEmptyWindow', { host: node.name });
}
