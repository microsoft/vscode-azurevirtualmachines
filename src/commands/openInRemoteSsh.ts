/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { join } from 'path';
import * as SSHConfig from 'ssh-config';
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
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(/^VirtualMachine.+linux.+running/, context);
    }

    await verifyRemoteSshExtension(context);

    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.ensureFile(sshConfigPath);
    const configFile: string = (await fse.readFile(sshConfigPath)).toString();
    const sshConfig: SSHConfig.HostConfigurationDirective[] = <SSHConfig.HostConfigurationDirective[]><unknown>SSHConfig.parse(configFile);
    const hostName: string = await node.getIpAddress();
    let host: string = node.name;
    let foundHostName: boolean = false;

    for (const hostEntry of sshConfig) {
        for (const config of hostEntry.config) {
            const castedConfig: SSHConfig.BaseConfigurationDirective = <SSHConfig.BaseConfigurationDirective>config;
            if (castedConfig.param === 'HostName' && castedConfig.value === hostName) {
                host = Array.isArray(hostEntry.value) ? hostEntry.value[0] : hostEntry.value;
                foundHostName = true;
                break;
            }
        }
    }

    if (!foundHostName) {
        await ext.ui.showWarningMessage(localize('unableFind', 'Unable to find host "{0}" in SSH config.', host), { title: localize('addSSH', 'Add new SSH config host') });
        await addSshKey(context, node);
    }

    await commands.executeCommand('opensshremotes.openEmptyWindow', { host });
}
