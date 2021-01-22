/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { ResourceDeleteError, ResourceToDelete } from "./deleteConstants";

export async function deleteWithOutput(resource: ResourceToDelete, errors: ResourceDeleteError[]): Promise<void> {
    const deleting: string = localize('Deleting', 'Deleting {0} "{1}"...', resource.resourceType, resource.resourceName);
    const deleteSucceeded: string = localize('DeleteSucceeded', 'Successfully deleted {0} "{1}".', resource.resourceType, resource.resourceName);

    ext.outputChannel.appendLog(deleting);
    try {
        await resource.deleteMethod();
    } catch (error) {
        ext.outputChannel.appendLog(localize('deleteFailed', 'Deleting {0} "{1}" failed.', resource.resourceType, resource.resourceName));
        // tslint:disable-next-line: no-unsafe-any
        errors.push({ resource, error });
        return;
    }

    ext.outputChannel.appendLog(deleteSucceeded);

    return;
}
