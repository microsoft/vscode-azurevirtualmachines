/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAzureQuickPickItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { ResourceToDelete } from "./deleteConstants";

export async function promptResourcesToDelete(resources: ResourceToDelete[]): Promise<IAzureQuickPickItem<ResourceToDelete>[]> {

    const quickPicks: IAzureQuickPickItem<ResourceToDelete>[] = resources.map(resource => {
        return { label: resource.resourceName, description: toTitleCase(resource.resourceType), data: resource, picked: resource.picked };
    });

    return await ext.ui.showQuickPick(quickPicks, { placeHolder: localize('selectResources', 'Select resources to delete'), canPickMany: true });
}

function toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}
