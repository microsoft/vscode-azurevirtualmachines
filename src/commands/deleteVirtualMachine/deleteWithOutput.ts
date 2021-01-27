/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { parseError } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { ResourceToDelete } from "./deleteConstants";

export async function deleteWithOutput(resource: ResourceToDelete, errors: string[]): Promise<void> {
    const deleting: string = localize('Deleting', 'Deleting {0} "{1}"...', resource.resourceType, resource.resourceName);
    const deleteSucceeded: string = localize('DeleteSucceeded', 'Successfully deleted {0} "{1}".', resource.resourceType, resource.resourceName);

    ext.outputChannel.appendLog(deleting);
    try {
        await resource.deleteMethod();
    } catch (error) {
        ext.outputChannel.appendLog(localize('deleteFailed', 'Deleting {0} "{1}" failed: {2}', resource.resourceType, resource.resourceName, parseError(error).message));
        errors.push(resource.resourceName);
        return;
    }

    ext.outputChannel.appendLog(deleteSucceeded);

    return;
}
