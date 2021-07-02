/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IAzureQuickPickItem, IWizardOptions } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';
import { ValidateWindowsNameStep } from './ValidateWindowsNameStep';

export enum VirtualMachineOS {
    linux = 'linux',
    windows = 'windows'
}

export class OSListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const picks: IAzureQuickPickItem<VirtualMachineOS>[] = Object.keys(VirtualMachineOS).map((key: string) => {
            const os: VirtualMachineOS = <VirtualMachineOS>VirtualMachineOS[key];
            return { label: this.getWebsiteOSDisplayName(os), data: os };
        });
        context.os = (await context.ui.showQuickPick(picks, { placeHolder: localize('selectOS', 'Select an OS.') })).data;
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return context.os === undefined;
    }

    public async getSubWizard(context: IVirtualMachineWizardContext): Promise<IWizardOptions<IVirtualMachineWizardContext> | undefined> {
        if (context.os === VirtualMachineOS.windows) {
            return { promptSteps: [new ValidateWindowsNameStep()] };
        }

        return undefined;
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
