/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { getWorkspaceSetting } from "../../../vsCodeConfig/settings";
import { ConfirmPassphraseStep } from "../ConfirmPassphraseStep";
import { IVirtualMachineWizardContext } from "../IVirtualMachineWizardContext";

export class PassphrasePromptStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const prompt: string = localize('passphrasePrompt', 'Enter a passphrase for connecting to this virtual machine');

        const placeHolder: string = localize('enterPassphrase', '(empty for no passphrase)');

        wizardContext.passphrase = (await ext.ui.showInputBox({
            prompt,
            placeHolder,
            password: true,
            validateInput: (value: string | undefined): string | undefined => this.validatePassphrase(value)
        }));
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        const promptForPassphrase: boolean | undefined = getWorkspaceSetting('promptForPassphrase');
        return !wizardContext.passphrase && !!promptForPassphrase;
    }

    public async getSubWizard(wizardContext: IVirtualMachineWizardContext): Promise<IWizardOptions<IVirtualMachineWizardContext> | undefined> {
        if (wizardContext.passphrase) {
            return {
                promptSteps: [new ConfirmPassphraseStep()]
            };
        }

        return undefined;
    }

    private validatePassphrase(value: string | undefined): string | undefined {
        const passphraseMinLength: number = 5;
        if (value && value.length < passphraseMinLength) {
            return localize('invalidLength', 'The passphrase must be at least {0} characters or empty for no passphrase.', passphraseMinLength);
        } else {
            return undefined;

        }
    }
}
