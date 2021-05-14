/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Extension, extensions } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export const remoteSshExtensionId: string = 'ms-vscode-remote.remote-ssh';
export async function verifyRemoteSshExtension(context: IActionContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extension: Extension<any> | undefined = extensions.getExtension(remoteSshExtensionId);
    if (extension) {
        if (!extension.isActive) {
            await extension.activate();
        }

    } else {
        void ext.ui.showWarningMessage(localize('remoteSshInstall', 'You must have the ["Remote - SSH" extension](command:azureVirtualMachines.showRemoteSshExtension) installed to perform this operation.'));
        context.telemetry.properties.cancelStep = 'installRemoteSsh';
        context.errorHandling.suppressDisplay = true;
        throw new Error(`${remoteSshExtensionId} extension is not installed.`);
    }
}
