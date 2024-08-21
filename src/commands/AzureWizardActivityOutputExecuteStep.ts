/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { activityFailContext, activityFailIcon, activityProgressContext, activityProgressIcon, activitySuccessContext, activitySuccessIcon, AzureWizardExecuteStep, createUniversallyUniqueContextValue, GenericParentTreeItem, GenericTreeItem, type ExecuteActivityOutput, type IActionContext } from "@microsoft/vscode-azext-utils";

export abstract class AzureWizardActivityOutputExecuteStep<T extends IActionContext> extends AzureWizardExecuteStep<T> {
    protected abstract getSuccessString(context: T): string;
    protected abstract getProgressString(context: T): string;
    protected abstract getFailString(context: T): string;
    abstract stepName: string;

    public createSuccessOutput(context: T): ExecuteActivityOutput {
        return createExecuteActivityOutput(context, {
            activityStatus: 'Success',
            label: this.getSuccessString(context),
            stepName: this.stepName
        });
    }

    public createProgressOutput(context: T): ExecuteActivityOutput {
        return createExecuteActivityOutput(context, {
            activityStatus: 'Progress',
            label: this.getProgressString(context),
            stepName: this.stepName
        });
    }

    public createFailOutput(context: T): ExecuteActivityOutput {
        return createExecuteActivityOutput(context, {
            activityStatus: 'Fail',
            label: this.getFailString(context),
            stepName: this.stepName
        });
    }

}

function createExecuteActivityOutput(context: IActionContext, options: {
    stepName: string
    activityStatus: 'Success' | 'Fail' | 'Progress',
    label: string
}): ExecuteActivityOutput {
    const activityContext = options.activityStatus === 'Success' ? activitySuccessContext : options.activityStatus === 'Fail' ? activityFailContext : activityProgressContext;
    const contextValue = createUniversallyUniqueContextValue([`nsgCreateStep${options.activityStatus}Item`, activityContext]);
    const label = options.label;
    const iconPath = options.activityStatus === 'Success' ? activitySuccessIcon : options.activityStatus === 'Fail' ? activityFailIcon : activityProgressIcon;

    const item = options.activityStatus === 'Fail' ?
        // there is logic that will automatically tack on error items as children if thrown in that step so return a parent tree item
        new GenericParentTreeItem(undefined, {
            contextValue,
            label,
            iconPath
        }) :
        new GenericTreeItem(undefined, {
            contextValue,
            label,
            iconPath
        });

    return {
        item,
        message: options.label
    }
}
