/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nonNullProp } from "../../utils/nonNull";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

let mismatchErrorThrown: boolean = false;
export class ConfirmPassphraseStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const prompt: string = localize('confirmPassphrase', 'Confirm your passphrase');
        await ext.ui.showInputBox({
            prompt,
            password: true,
            validateInput: async (value: string | undefined): Promise<string | undefined> => await this.validatePassphrase(wizardContext, value)
        });
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        return !!wizardContext.passphrase;
    }

    private async validatePassphrase(wizardContext: IVirtualMachineWizardContext, passphrase: string | undefined): Promise<string | undefined> {
        if (passphrase === wizardContext.passphrase) {
            // do nothing here
        } else if ((passphrase && passphrase !== wizardContext.passphrase && passphrase.length >= nonNullProp(wizardContext, 'passphrase').length) || mismatchErrorThrown) {
            mismatchErrorThrown = true;
            return localize('passphraseMatch', 'The passphrases must match.');
        }

        return undefined;
    }
}
