/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import { join } from 'path';
import * as SSHConfig from 'ssh-config';
import { commands } from 'vscode';
import { sshFsPath } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { ResolvedVirtualMachineTreeItem, VirtualMachineTreeItem } from '../tree/VirtualMachineTreeItem';
import { addSshKey } from './addSshKey';
import { verifyRemoteSshExtension } from './verifyRemoteSshExtension';

export async function openInRemoteSsh(context: IActionContext, node?: ResolvedVirtualMachineTreeItem): Promise<void> {
    if (!node) {
        node = await ext.rgApi.tree.showTreeItemPicker<ResolvedVirtualMachineTreeItem>(new RegExp(VirtualMachineTreeItem.linuxContextValue), context);
    }

    await verifyRemoteSshExtension(context);

    const sshConfigPath: string = join(sshFsPath, 'config');
    await fse.ensureFile(sshConfigPath);
    const configFile: string = (await fse.readFile(sshConfigPath)).toString();
    const sshConfig: SSHConfig.HostConfigurationDirective[] = <SSHConfig.HostConfigurationDirective[]>SSHConfig.parse(configFile);
    const hostName: string = await node.getIpAddress(context);

    const hostConfig: SSHConfig.HostConfigurationDirective | undefined = sshConfig.find(hostEntry => {
        return hostEntry.config && hostEntry.config.find(config => {
            const castedConfig: SSHConfig.BaseConfigurationDirective = <SSHConfig.BaseConfigurationDirective>config;
            return castedConfig.param === 'HostName' && castedConfig.value === hostName;
        });
    });

    let host: string;
    if (hostConfig === undefined) {
        await context.ui.showWarningMessage(localize('unableFind', 'Unable to find host "{0}" in SSH config.', node.name), { title: localize('addSSH', 'Add new SSH config host') });
        await addSshKey(context, node);
        host = node.name;
    } else {
        host = Array.isArray(hostConfig.value) ? hostConfig.value[0] : hostConfig.value;
    }

    await commands.executeCommand('opensshremotes.openEmptyWindow', { host });
}
