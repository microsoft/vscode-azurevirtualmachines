/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { ConfirmPassphraseStep } from "./ConfirmPassphraseStep";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export class PassphrasePromptStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const prompt: string = localize('passphrasePrompt', 'Enter a passphrase for connecting to this Virtual Machine');
        const placeHolder: string = localize('enterPassphrase', 'Enter passphrase (empty for no passphrase)');
        wizardContext.passphrase = (await ext.ui.showInputBox({
            prompt,
            placeHolder,
            password: true,
            validateInput: async (value: string | undefined): Promise<string | undefined> => await this.validatePassphrase(value)
        }));
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        return !wizardContext.passphrase;
    }

    public async getSubWizard(wizardContext: IVirtualMachineWizardContext): Promise<IWizardOptions<IVirtualMachineWizardContext> | undefined> {
        if (wizardContext.passphrase) {
            return {
                promptSteps: [new ConfirmPassphraseStep()]
            };
        } else {
            return undefined;
        }
    }

    private async validatePassphrase(passphrase: string | undefined): Promise<string | undefined> {
        const passphraseMinLength: number = 5;
        if (passphrase && passphrase.length < passphraseMinLength) {
            return localize('invalidLength', 'The passphrase must be at least {0} characters or empty for no passphrase.', passphraseMinLength);
        } else {
            return undefined;
        }
    }
}
