/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nonNullProp } from "../../utils/nonNull";
import { getWorkspaceSetting } from "../../vsCodeConfig/settings";
import { ConfirmPassphraseStep } from "./ConfirmPassphraseStep";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";
import { VirtualMachineOS } from "./OSListStep";

export class PassphrasePromptStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const prompt: string = wizardContext.os === VirtualMachineOS.linux ?
            localize('passphrasePrompt', 'Enter a passphrase for connecting to this Virtual Machine') :
            localize('passwordPrompt', 'Enter an admin password');

        const placeHolder: string = wizardContext.os === VirtualMachineOS.linux ?
            localize('enterPassphrase', 'Enter passphrase (empty for no passphrase)') :
            localize('enterPassphrase', 'Enter password');

        wizardContext.passphrase = (await ext.ui.showInputBox({
            prompt,
            placeHolder,
            password: true,
            validateInput: async (value: string | undefined): Promise<string | undefined> => await this.validatePassphrase(nonNullProp(wizardContext, 'os'), value)
        }));
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        const promptForPassphrase: boolean | undefined = getWorkspaceSetting('promptForPassphrase');
        return !wizardContext.passphrase && !(!promptForPassphrase && wizardContext.os === VirtualMachineOS.linux);
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

    private async validatePassphrase(os: VirtualMachineOS, value: string | undefined): Promise<string | undefined> {
        if (os === VirtualMachineOS.windows) {
            const passwordMinLength: number = 8;
            const passwordMaxLength: number = 123;

            if (!value) {
                return localize('nonEmpty', 'The password must not be empty');
            } else if (value.length < passwordMinLength || value.length > passwordMaxLength) {
                return localize('invalidLength', 'The password must be between {0} and {1} characters long', passwordMinLength, passwordMaxLength);
            } else if (this.numberOfPasswordComplexityRequirements(value) < 3) {
                return localize('passwordComplexity', 'Password must have 3 of the following: 1 lower case character, 1 upper case character, 1 number, and 1 special character.');
            } else {
                return undefined;
            }
        } else {
            const passphraseMinLength: number = 5;
            if (value && value.length < passphraseMinLength) {
                return localize('invalidLength', 'The passphrase must be at least {0} characters or empty for no passphrase.', passphraseMinLength);
            } else {
                return undefined;
            }
        }
    }

    private numberOfPasswordComplexityRequirements(password: string): number {
        const lowercase: RegExp = /[a-z]/;
        const uppercase: RegExp = /[A-Z]/;
        const numeric: RegExp = /[0-9]/;
        const specialCharacters: RegExp = /[!@#\$%\^&\*]/;

        // tslint:disable: strict-boolean-expressions
        const lowercaseRequirement: number = password.match(lowercase)?.length || 0;
        const uppercaseRequirement: number = password.match(uppercase)?.length || 0;
        const numericRequirement: number = password.match(numeric)?.length || 0;
        const specialCharactersRequirement: number = password.match(specialCharacters)?.length || 0;
        // tslint:enable: strict-boolean-expressions

        return lowercaseRequirement + uppercaseRequirement + numericRequirement + specialCharactersRequirement;
    }
}
