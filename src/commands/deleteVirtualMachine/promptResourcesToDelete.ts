/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAzureQuickPickItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { ResourceToDelete } from "./deleteConstants";

export async function promptResourcesToDelete(resourcesP: Promise<ResourceToDelete[]>): Promise<IAzureQuickPickItem<ResourceToDelete>[]> {
    return await ext.ui.showQuickPick(mapToQuickpicks(resourcesP), { placeHolder: localize('selectResources', 'Select resources to delete'), canPickMany: true });
}

async function mapToQuickpicks(resourcesP: Promise<ResourceToDelete[]>): Promise<IAzureQuickPickItem<ResourceToDelete>[]> {
    const resources: ResourceToDelete[] = await resourcesP;
    return resources.map(resource => {
        return { label: resource.resourceName, description: resource.resourceType, data: resource, picked: resource.picked };
    });
}
