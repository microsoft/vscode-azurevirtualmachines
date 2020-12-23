/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, Extension, extensions } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function verifyRemoteSshExtension(context: IActionContext): Promise<void> {
    const remoteSshExtensionId: string = 'ms-vscode-remote.remote-ssh';
    // tslint:disable-next-line:no-any
    const extension: Extension<any> | undefined = extensions.getExtension(remoteSshExtensionId);
    if (extension) {
        if (!extension.isActive) {
            await extension.activate();
        }

    } else {
        await ext.ui.showWarningMessage(localize('remoteSshInstall', 'You must have the "Remote - SSH" extension installed to perform this operation.'), { title: 'Install' });
        commands.executeCommand('extension.open', remoteSshExtensionId);

        context.telemetry.properties.cancelStep = 'installRemoteSsh';
        context.errorHandling.suppressDisplay = true;

        throw new Error(`${remoteSshExtensionId} extension is not installed.`);
    }
}
