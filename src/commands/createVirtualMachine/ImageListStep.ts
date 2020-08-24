/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementModels } from '@azure/arm-compute';
import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';
import { VirtualMachineOS } from './OSListStep';

type ImageReferenceWithLabel = ComputeManagementModels.ImageReference & { label: string };

export const ubuntu1804LTSImage: ImageReferenceWithLabel = {
    label: 'Ubuntu Server 18.04 LTS - Gen1',
    publisher: 'Canonical',
    offer: 'UbuntuServer',
    sku: '18.04-LTS',
    version: 'latest'
};

export class ImageListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {

    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const placeHolder: string = localize('selectImage', 'Select an image');
        context.image = (await ext.ui.showQuickPick(this.getAvailableImages(context.os).map((ir) => { return { label: ir.label, data: ir }; }), {
            placeHolder
        })).data;
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return !context.image;
    }

    // tslint:disable-next-line:max-func-body-length
    private getAvailableImages(os: VirtualMachineOS | undefined): ImageReferenceWithLabel[] {
        return os !== VirtualMachineOS.windows ?
            [
                ubuntu1804LTSImage,
                {
                    label: 'Red Hat Enterprise Linux 8.2 (LVM) - Gen1',
                    publisher: 'RedHat',
                    offer: 'RHEL',
                    sku: '8.2',
                    version: 'latest'
                },
                {
                    label: 'SUSE Enterprise Linux 15 SP1 - Gen1',
                    publisher: 'suse',
                    offer: 'sles-15-sp1-basic',
                    sku: 'gen1',
                    version: 'latest'
                },
                {
                    label: 'CentOS-based 8.2 - Gen1',
                    publisher: 'OpenLogic',
                    offer: 'CentOS',
                    sku: '8_2',
                    version: 'latest'
                },
                {
                    label: 'Debian 10 "Buster" - Gen1',
                    publisher: 'debian',
                    offer: 'debian-10',
                    sku: '10',
                    version: 'latest'
                },
                {
                    label: 'Oracle Linux 7.8 - Gen1',
                    publisher: 'Oracle',
                    offer: 'Oracle-Linux',
                    sku: '78',
                    version: 'latest'
                },
                {
                    label: 'Ubuntu Server 16.04 LTS - Gen1',
                    publisher: 'Canonical',
                    offer: 'UbuntuServer',
                    sku: '16.04-LTS',
                    version: 'latest'
                },
                {
                    label: 'Data Science Virtual Machine - Ubuntu 18.04 - Gen1',
                    publisher: 'microsoft-dsvm',
                    offer: 'ubuntu-1804',
                    sku: '1804',
                    version: 'latest'
                }
            ] :
            [
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
