/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IAzureQuickPickItem, IWizardOptions } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { AdminPasswordPromptStep } from './AdminPasswordPromptStep';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';
import { LinuxImageListStep } from './LinuxImageListStep';
import { PassphrasePromptStep } from './PassphrasePromptStep';
import { UsernamePromptStep } from './UsernamePromptStep';
import { ValidateWindowsNameStep } from './ValidateWindowsNameStep';
import { WindowsImageListStep } from './WindowsImageListStep';

export enum VirtualMachineOS {
    linux = 'linux',
    windows = 'windows'
}

export class OSListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(wizardContext: IVirtualMachineWizardContext): Promise<void> {
        const picks: IAzureQuickPickItem<VirtualMachineOS>[] = Object.keys(VirtualMachineOS).map((key: string) => {
            const os: VirtualMachineOS = <VirtualMachineOS>VirtualMachineOS[key];
            return { label: this.getWebsiteOSDisplayName(os), data: os };
        });
        wizardContext.os = (await ext.ui.showQuickPick(picks, { placeHolder: localize('selectOS', 'Select an OS.') })).data;
    }

    public shouldPrompt(wizardContext: IVirtualMachineWizardContext): boolean {
        return wizardContext.os === undefined;
    }

    public async getSubWizard(wizardContext: IVirtualMachineWizardContext): Promise<IWizardOptions<IVirtualMachineWizardContext> | undefined> {
        if (wizardContext.os === VirtualMachineOS.windows) {
            return { promptSteps: [new ValidateWindowsNameStep(), new WindowsImageListStep(), new UsernamePromptStep(), new AdminPasswordPromptStep()] };
        } else {
            return { promptSteps: [new LinuxImageListStep(), new UsernamePromptStep(), new PassphrasePromptStep()] };
        }
    }

    private getWebsiteOSDisplayName(kind: VirtualMachineOS): string {
        switch (kind) {
            case VirtualMachineOS.windows:
                return 'Windows';
            case VirtualMachineOS.linux:
                return 'Linux';
            default:
                throw new RangeError();
        }
    }
}
