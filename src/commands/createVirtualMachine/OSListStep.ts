/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperatingSystemTypes } from '@azure/arm-compute';
import { AzureWizardPromptStep, IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';
import { ValidateWindowsNameStep } from './ValidateWindowsNameStep';

export class OSListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const picks: IAzureQuickPickItem<OperatingSystemTypes>[] = [
            { label: 'Linux', data: 'Linux' },
            { label: 'Windows', data: 'Windows' }
        ];

        context.os = (await context.ui.showQuickPick(picks, { placeHolder: localize('selectOS', 'Select an OS') })).data;
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return context.os === undefined;
    }

    public async getSubWizard(context: IVirtualMachineWizardContext): Promise<IWizardOptions<IVirtualMachineWizardContext> | undefined> {
        if (context.os === 'Windows') {
            return { promptSteps: [new ValidateWindowsNameStep()] };
        }

        return undefined;
    }
}
