/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class ValidateWindowsNameStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const nameWithNoPeriods: string | undefined = context.newVirtualMachineName?.replace(/\./g, '');
        const noPeriods: string = localize('noPeriods', 'Windows VM names cannot contain periods.  Use "{0}" instead?', nameWithNoPeriods);
        await context.ui.showWarningMessage(noPeriods, { modal: true }, { title: localize('use', 'Use') });
        context.newVirtualMachineName = nameWithNoPeriods;
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return context.newVirtualMachineName?.includes('.') || false;
    }
}
