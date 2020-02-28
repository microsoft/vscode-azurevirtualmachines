/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureNameStep } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export class ConfirmPassphraseStep extends AzureNameStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const prompt: string = localize('reconfirmPassphrase', 'Re-confirm your passphrase');
        await ext.ui.showInputBox({
            prompt,
            password: true,
            validateInput: async (value: string | undefined): Promise<string | undefined> => await this.validatePassphrase(wizardContext, value)
        });
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        return !!wizardContext.passphrase;
    }

    protected async isRelatedNameAvailable(_wizardContext: IVirtualMachineWizardContext, _name: string): Promise<boolean> {
        return true;
    }

    private async validatePassphrase(wizardContext: IVirtualMachineWizardContext, passphrase: string | undefined): Promise<string | undefined> {
        if (passphrase !== wizardContext.passphrase) {
            return localize('passphraseMatch', 'The passphrases must match.');
        } else {
            return undefined;
        }
    }
}
