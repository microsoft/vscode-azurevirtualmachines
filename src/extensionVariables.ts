/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeDataProvider, AzExtTreeItem, IAzExtOutputChannel } from "@microsoft/vscode-azext-utils";
import { ExtensionContext, TreeView } from "vscode";
import { AzureResourceGroupsExtensionApi } from "./api";
import { AzureAccountTreeItem } from "./tree/AzureAccountTreeItem";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export namespace ext {
    export let outputChannel: IAzExtOutputChannel;
    export let context: ExtensionContext;

    export let tree: AzExtTreeDataProvider;
    export let treeView: TreeView<AzExtTreeItem>;
    export let azureAccountTreeItem: AzureAccountTreeItem;
    export let ignoreBundle: boolean | undefined;
    export const prefix: string = 'azureVirtualMachines';

    export let rgApi: AzureResourceGroupsExtensionApi;
}
