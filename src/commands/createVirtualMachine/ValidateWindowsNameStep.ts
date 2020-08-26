/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class ValidateWindowsNameStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const nameWithNoPeriods: string | undefined = wizardContext.newVirtualMachineName?.replace(/\./g, '');
        const noPeriods: string = localize('noPeriods', 'Windows VM names cannot contain periods.  Use "{0}" instead?', nameWithNoPeriods);
        await ext.ui.showWarningMessage(noPeriods, { modal: true }, { title: localize('use', 'Use') });
        wizardContext.newVirtualMachineName = nameWithNoPeriods;
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        return wizardContext.newVirtualMachineName?.includes('.') || false;
    }
}
