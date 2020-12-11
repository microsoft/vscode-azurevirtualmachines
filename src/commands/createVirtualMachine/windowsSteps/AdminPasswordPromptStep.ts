/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { ConfirmPassphraseStep } from "../ConfirmPassphraseStep";
import { IVirtualMachineWizardContext } from "../IVirtualMachineWizardContext";

export class AdminPasswordPromptStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const prompt: string = localize('passwordPrompt', 'Enter an admin password');

        wizardContext.passphrase = (await ext.ui.showInputBox({
            prompt,
            password: true,
            validateInput: (value: string | undefined): string | undefined => this.validatePassphrase(value)
        }));
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        return !wizardContext.passphrase;
    }

    public async getSubWizard(_wizardContext: IVirtualMachineWizardContext): Promise<IWizardOptions<IVirtualMachineWizardContext> | undefined> {
        return {
            promptSteps: [new ConfirmPassphraseStep()]
        };
    }

    private validatePassphrase(value: string | undefined): string | undefined {
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

        // tslint:disable: strict-boolean-expressions
        const lowercaseRequirement: number = password.match(lowercase)?.length || 0;
        const uppercaseRequirement: number = password.match(uppercase)?.length || 0;
        const numericRequirement: number = password.match(numeric)?.length || 0;
        const specialCharactersRequirement: number = password.match(specialCharacters)?.length || 0;
        // tslint:enable: strict-boolean-expressions

        return lowercaseRequirement + uppercaseRequirement + numericRequirement + specialCharactersRequirement;
    }
}
