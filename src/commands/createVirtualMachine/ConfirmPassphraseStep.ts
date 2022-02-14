/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "@microsoft/vscode-azext-utils";
import { localize } from "../../localize";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export class ConfirmPassphraseStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const prompt: string = localize('confirmPassphrase', 'Confirm your passphrase');
        await context.ui.showInputBox({
            prompt,
            password: true,
            validateInput: async (value: string | undefined): Promise<string | undefined> => await this.validatePassphrase(context, value)
        });
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return !!context.passphrase;
    }

    private async validatePassphrase(context: IVirtualMachineWizardContext, passphrase: string | undefined): Promise<string | undefined> {
        if (passphrase !== context.passphrase) {
            return localize('passphraseMatch', 'The passphrases must match.');
        }

        return undefined;
    }
}
