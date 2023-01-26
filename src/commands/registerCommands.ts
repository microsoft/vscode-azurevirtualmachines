/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { registerCommand, registerCommandWithTreeNodeUnwrapping, registerErrorHandler, registerReportIssueCommand } from "@microsoft/vscode-azext-utils";
import * as vscode from 'vscode';
import { remoteSshExtensionId } from "../constants";
import { ext } from "../extensionVariables";
import { addSshKey } from "./addSshKey";
import { copyIpAddress } from "./copyIpAddress";
import { createVirtualMachine, createVirtualMachineAdvanced } from "./createVirtualMachine/createVirtualMachine";
import { deleteVirtualMachine } from "./deleteVirtualMachine/deleteVirtualMachine";
import { openInRemoteSsh } from "./openInRemoteSsh";
import { restartVirtualMachine } from "./restartVirtualMachine";
import { startVirtualMachine } from "./startVirtualMachine";
import { stopVirtualMachine } from "./stopVirtualMachine";

export function registerCommands(): void {
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.createVirtualMachine', createVirtualMachine);
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.createVirtualMachineAdvanced', createVirtualMachineAdvanced);
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.startVirtualMachine', startVirtualMachine);
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.restartVirtualMachine', restartVirtualMachine);
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.stopVirtualMachine', stopVirtualMachine);
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.addSshKey', addSshKey);
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.deleteVirtualMachine', deleteVirtualMachine);
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.copyIpAddress', copyIpAddress);
    registerCommandWithTreeNodeUnwrapping('azureVirtualMachines.openInRemoteSsh', openInRemoteSsh);
    registerCommand('azureVirtualMachines.showOutputChannel', () => ext.outputChannel.show());
    registerCommand('azureVirtualMachines.showRemoteSshExtension', () => void vscode.commands.executeCommand('extension.open', remoteSshExtensionId));

    // Suppress "Report an Issue" button for all errors in favor of the command
    registerErrorHandler(c => c.errorHandling.suppressReportIssue = true);
    registerReportIssueCommand('azureVirtualMachines.reportIssue');
}
