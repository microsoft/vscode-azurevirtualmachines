/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { localize } from '../../localize';
import { ImageReferenceWithLabel, IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';
import { VirtualMachineOS } from "./OSListStep";

export class ImageListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const placeHolder: string = localize('selectImage', 'Select an image');
        context.image = (await context.ui.showQuickPick(this.getAvailableImages(context).map((ir) => { return { label: ir.label, data: ir }; }), {
            placeHolder
        })).data;
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return !context.image;
    }

    private getAvailableImages(context: IVirtualMachineWizardContext): ImageReferenceWithLabel[] {
        return context.os === VirtualMachineOS.windows ? windowsImages : linuxImages;
    }
}

export const ubuntu1804LTSImage: ImageReferenceWithLabel = {
    label: 'Ubuntu Server 18.04 LTS - Gen1',
    publisher: 'Canonical',
    offer: 'UbuntuServer',
    sku: '18.04-LTS',
    version: 'latest'
};

const linuxImages: ImageReferenceWithLabel[] = [
    ubuntu1804LTSImage,
    {
        label: 'Red Hat Enterprise Linux 8.2 (LVM) - Gen1',
        publisher: 'RedHat',
        offer: 'RHEL',
        sku: '8.2',
        version: 'latest'
    },
    {
        label: 'SUSE Enterprise Linux 15 SP2 - Gen1',
        publisher: 'suse',
        offer: 'sles-15-sp2-basic',
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
];

const windowsImages: ImageReferenceWithLabel[] = [
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
        label: 'Windows 10 Pro, Version 20H2 - Gen 1',
        publisher: 'MicrosoftWindowsDesktop',
        offer: 'Windows-10',
        sku: '20h2-pro',
        version: 'latest'
    }];
