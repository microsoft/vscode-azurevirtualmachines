/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, DialogResponses, nonNullProp } from "@microsoft/vscode-azext-utils";
import { virtualMachineLabel } from "../../constants";
import { localize } from "../../localize";
import { type IDeleteChildImplContext } from "./deleteConstants";

export class ConfirmDeleteStep extends AzureWizardPromptStep<IDeleteChildImplContext> {
    public async prompt(context: IDeleteChildImplContext): Promise<void> {
        const resourcesToDelete = nonNullProp(context, 'resourcesToDelete');

        const multiDelete: boolean = resourcesToDelete.length > 1;
        const resourceList: string = resourcesToDelete.map(r => `"${r.resourceName}"`).join(', ');
        context.resourceList = resourceList;

        const confirmMessage: string = multiDelete ? localize('multiDeleteConfirmation', 'Are you sure you want to delete the following resources: {0}?', resourceList) :
            localize('deleteConfirmation', 'Are you sure you want to delete {0} "{1}"?', resourcesToDelete[0].resourceType, resourcesToDelete[0].resourceName);

        await context.ui.showWarningMessage(confirmMessage, { modal: true }, DialogResponses.deleteResponse);

        const deleteVm = resourcesToDelete.some(r => r.resourceType === virtualMachineLabel);
        context.telemetry.properties.numOfResources = resourcesToDelete.length.toString();
        context.telemetry.properties.deleteVm = String(deleteVm);
    }


    public shouldPrompt(): boolean {
        return true;
    }
}
