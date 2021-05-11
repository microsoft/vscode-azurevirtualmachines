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
        node = await ext.tree.showTreeItemPicker<VirtualMachineTreeItem>(VirtualMachineTreeItem.linuxContextValue, context);
    }

    await verifyRemoteSshExtension(context);

    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.ensureFile(sshConfigPath);
    const configFile: string = (await fse.readFile(sshConfigPath)).toString();
    const sshConfig: SSHConfig.HostConfigurationDirective[] = <SSHConfig.HostConfigurationDirective[]>SSHConfig.parse(configFile);
    const hostName: string = await node.getIpAddress();

    const hostConfig: SSHConfig.HostConfigurationDirective | undefined = sshConfig.find(hostEntry => {
        return hostEntry.config && hostEntry.config.find(config => {
            const castedConfig: SSHConfig.BaseConfigurationDirective = <SSHConfig.BaseConfigurationDirective>config;
            return castedConfig.param === 'HostName' && castedConfig.value === hostName;
        });
    });

    let host: string;
    if (hostConfig === undefined) {
        await ext.ui.showWarningMessage(localize('unableFind', 'Unable to find host "{0}" in SSH config.', node.name), { title: localize('addSSH', 'Add new SSH config host') });
        await addSshKey(context, node);
        host = node.name;
    } else {
        host = Array.isArray(hostConfig.value) ? hostConfig.value[0] : hostConfig.value;
    }

    await commands.executeCommand('opensshremotes.openEmptyWindow', { host });
}
