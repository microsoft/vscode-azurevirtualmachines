/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { ImageReferenceWithLabel, IVirtualMachineWizardContext } from "../IVirtualMachineWizardContext";

export class WindowsImageListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {

    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const placeHolder: string = localize('selectImage', 'Select an image');
        context.image = (await ext.ui.showQuickPick(this.getAvailableImages().map((ir) => { return { label: ir.label, data: ir }; }), {
            placeHolder
        })).data;
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return !context.image;
    }

    // tslint:disable-next-line:max-func-body-length
    private getAvailableImages(): ImageReferenceWithLabel[] {
        return [
            {
                label: 'Windows Server 2019 Datacenter - Gen 1',
                publisher: 'MicrosoftWindowsServer',
                offer: 'WindowsServer',
                sku: '2019-Datacenter',
                version: 'latest'
            },
            {
                label: 'Windows Server 2016 Datacenter - Gen 1',
                publisher: 'MicrosoftWindowsServer',
                offer: 'WindowsServer',
                sku: '2016-Datacenter',
                version: 'latest'
            },
            {
                label: 'Windows Server 2012 R2 Datacenter - Gen 1',
                publisher: 'MicrosoftWindowsServer',
                offer: 'WindowsServer',
                sku: '2012-R2-Datacenter',
                version: 'latest'
            },
            {
                label: 'Windows 10 Pro, Version 1809 - Gen1',
                publisher: 'MicrosoftWindowsDesktop',
                offer: 'Windows-10',
                sku: 'rs5-pro',
                version: 'latest'
            }];
    }
}
