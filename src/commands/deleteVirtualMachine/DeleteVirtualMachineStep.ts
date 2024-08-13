/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { nonNullProp, type AzExtErrorButton } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { viewOutput, virtualMachineLabel } from "../../constants";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { AzureWizardActivityOutputExecuteStep } from "../AzureWizardActivityOutputExecuteStep";
import { deleteAllResources } from "./deleteAllResources";
import { type IDeleteChildImplContext, type ResourceToDelete } from "./deleteConstants";

export class DeleteVirtualMachineStep extends AzureWizardActivityOutputExecuteStep<IDeleteChildImplContext> {
    public priority: number = 100;
    stepName: string = 'deleteVirtualMachineStep';

    public async execute(context: IDeleteChildImplContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined; }>): Promise<void> {

        const node = nonNullProp(context, 'node');
        const resourcesToDelete = nonNullProp(context, 'resourcesToDelete');
        const multiDelete: boolean = resourcesToDelete.length > 1;

        const message: string = multiDelete ? localize('deleteVirtualMachine', 'Delete {0}...', context.resourceList) :
            localize('Deleting', 'Delete {0} "{1}"...', resourcesToDelete[0].resourceType, resourcesToDelete[0].resourceName);

        progress.report({ message });

        if (multiDelete) {
            ext.outputChannel.appendLog(message);
        }

        const failedResources: ResourceToDelete[] = await deleteAllResources(context, node.subscription, node.resourceGroup, resourcesToDelete);
        const failedResourceList: string = failedResources.map(r => `"${r.resourceName}"`).join(', ');

        const messageDeleteWithErrors: string = localize('messageDeleteWithErrors', 'Failed to delete the following resource(s): {0}.', failedResourceList);

        const deleteSucceeded: string = multiDelete ? localize('DeleteSucceeded', 'Successfully deleted {0}.', context.resourceList) :
            localize('DeleteSucceeded', 'Successfully deleted {0} "{1}".', resourcesToDelete[0].resourceType, resourcesToDelete[0].resourceName);

        // single resources are already displayed in the output channel
        if (multiDelete) {
            ext.outputChannel.appendLog(failedResources.length > 0 ? messageDeleteWithErrors : deleteSucceeded);
        }

        if (failedResources.length > 0) {
            context.telemetry.properties.failedResources = failedResources.length.toString();
            // if the vm failed to delete or was not being deleted, we want to throw an error to make sure that the node is not removed from the tree
            if (failedResources.some(r => r.resourceType === virtualMachineLabel) || !context.deleteVm) {
                // tslint:disable-next-line: no-floating-promises
                const viewOutputAzureButton: AzExtErrorButton = { title: viewOutput.title, callback: async (): Promise<void> => ext.outputChannel.show() };
                context.errorHandling.buttons = [viewOutputAzureButton];
                throw new Error(messageDeleteWithErrors);
            }

            void context.ui.showWarningMessage(`${messageDeleteWithErrors} Check the [output channel](command:${ext.prefix}.showOutputChannel) for more information.`);
        }
    }

    public shouldExecute(): boolean {
        return true;
    }

    protected getSuccessString(context: IDeleteChildImplContext): string {
        return localize('deletedVm', 'Deleted virtual machine "{0}".', context.resourceList);
    }

    protected getProgressString(context: IDeleteChildImplContext): string {
        return localize('deletingVm', 'Deleting virtual machine "{0}"...', context.resourceList);
    }

    protected getFailString(context: IDeleteChildImplContext): string {
        return this.getSuccessString(context);
    }
}
