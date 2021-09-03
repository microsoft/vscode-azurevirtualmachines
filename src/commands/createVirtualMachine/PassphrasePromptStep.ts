/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from "vscode-azureextensionui";
import { localize } from "../../localize";
import { getWorkspaceSetting } from "../../vsCodeConfig/settings";
import { ConfirmPassphraseStep } from "./ConfirmPassphraseStep";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export class PassphrasePromptStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const isWindows: boolean = context.os === 'Windows';
        const prompt: string = !isWindows ? localize('passphrasePrompt', 'Enter a passphrase for connecting to this virtual machine') : localize('passwordPrompt', 'Enter an admin password');
        const placeHolder: string = !isWindows ? localize('enterPassphrase', '(empty for no passphrase)') : '';

        context.passphrase = (await context.ui.showInputBox({
            prompt,
            placeHolder,
            password: true,
            validateInput: (value: string | undefined): string | undefined => this.validatePassphrase(value, isWindows)
        }));
        context.valuesToMask.push(context.passphrase);
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        const promptForPassphrase: boolean | undefined = getWorkspaceSetting('promptForPassphrase');
        return !context.passphrase && !(!promptForPassphrase && context.os === 'Linux');
    }

    public async getSubWizard(context: IVirtualMachineWizardContext): Promise<IWizardOptions<IVirtualMachineWizardContext> | undefined> {
        if (context.passphrase) {
            return {
                promptSteps: [new ConfirmPassphraseStep()]
            };
        }

        return undefined;
    }

    private validatePassphrase(value: string | undefined, isWindows: boolean): string | undefined {
        return !isWindows ? this.validateLinuxPassphrase(value) : this.validateWindowsPassword(value);
    }

    private validateLinuxPassphrase(value: string | undefined): string | undefined {
        const passphraseMinLength: number = 5;
        if (value && value.length < passphraseMinLength) {
            return localize('invalidLength', 'The passphrase must be at least {0} characters or empty for no passphrase.', passphraseMinLength);
        } else {
            return undefined;

        }
    }

    private validateWindowsPassword(value: string | undefined): string | undefined {
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

    }

    private numberOfPasswordComplexityRequirements(password: string): number {
        const lowercase: RegExp = /[a-z]/;
        const uppercase: RegExp = /[A-Z]/;
        const numeric: RegExp = /[0-9]/;
        const specialCharacters: RegExp = /[!@#\$%\^&\*]/;

        const lowercaseRequirement: number = password.match(lowercase)?.length || 0;
        const uppercaseRequirement: number = password.match(uppercase)?.length || 0;
        const numericRequirement: number = password.match(numeric)?.length || 0;
        const specialCharactersRequirement: number = password.match(specialCharacters)?.length || 0;

        return lowercaseRequirement + uppercaseRequirement + numericRequirement + specialCharactersRequirement;
    }
}
