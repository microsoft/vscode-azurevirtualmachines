/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import { join } from "path";
import { type MessageItem } from "vscode";
import { localize } from "./localize";

export const viewOutput: MessageItem = { title: localize('viewOutput', 'View Output') };
export const remoteSshExtensionId: string = 'ms-vscode-remote.remote-ssh';

export const networkInterfaceLabel: string = localize('networkInterface', 'network interface');
export const virtualMachineLabel: string = localize('virtualMachine', 'virtual machine');
export const virtualNetworkLabel: string = localize('virtualNetwork', 'virtual network');

export const sshFsPath: string = join(os.homedir(), '.ssh');

export const vmFilter = {
    type: 'Microsoft.Compute/virtualMachines'
}
