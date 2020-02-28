/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureNameStep, AzureWizardPromptStep, IAzureNamingRules, IWizardOptions } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { ConfirmPassphraseStep } from "./ConfirmPassphraseStep";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export const passphraseNamingRules: IAzureNamingRules = {
    minLength: 5,
    maxLength: 0, // there is no max length
    invalidCharsRegExp: /[]/ // accepts all characters
};

export class PassphrasePromptStep extends AzureNameStep<IVirtualMachineWizardContext> {
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

    protected async isRelatedNameAvailable(_wizardContext: IVirtualMachineWizardContext, _name: string): Promise<boolean> {
        return true;
    }

    private async validatePassphrase(passphrase: string | undefined): Promise<string | undefined> {
        if (passphrase && passphrase.length < passphraseNamingRules.minLength) {
            return localize('invalidLength', 'The passphrase must be at least {0} characters.', passphraseNamingRules.minLength);
        } else {
            return undefined;
        }
    }
}
