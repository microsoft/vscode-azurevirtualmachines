/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import { NetworkManagementModels } from '@azure/arm-network';
import { MessageItem, Progress, window } from "vscode";
import { AzureWizardExecuteStep, callWithTelemetryAndErrorHandling, createAzureClient, IActionContext } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { nonNullProp, nonNullValueAndProp } from '../../utils/nonNull';
import { getSshKey } from "../../utils/sshUtils";
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';
import { VirtualMachineOS } from './OSListStep';

export class VirtualMachineCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 260;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const computeClient: ComputeManagementClient = createAzureClient(context, ComputeManagementClient);
        const hardwareProfile: ComputeManagementModels.HardwareProfile = { vmSize: context.size };

        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        const storageProfile: ComputeManagementModels.StorageProfile = {
            imageReference: context.image,
            osDisk: { name: vmName, createOption: 'FromImage', managedDisk: { storageAccountType: 'Premium_LRS' } }
        };

        const networkInterface: NetworkManagementModels.NetworkInterface = nonNullProp(context, 'networkInterface');
        const networkProfile: ComputeManagementModels.NetworkProfile = { networkInterfaces: [{ id: networkInterface.id }] };

        const windowConfiguration: ComputeManagementModels.WindowsConfiguration = {};
        const linuxConfiguration: ComputeManagementModels.LinuxConfiguration = {
            disablePasswordAuthentication: true, ssh: {
                publicKeys: [{
                    // tslint:disable-next-line: strict-boolean-expressions
                    keyData: await getSshKey(vmName, context.passphrase || ''),
                    // because this is a Linux VM, use '/' as path separator rather than using path.join()
                    path: `/home/${context.adminUsername}/.ssh/authorized_keys`
                }]
            }
        };

        const osProfile: ComputeManagementModels.OSProfile = { computerName: vmName, adminUsername: context.adminUsername };
        if (context.os === VirtualMachineOS.linux) {
            osProfile.linuxConfiguration = linuxConfiguration;
        } else {
            osProfile.adminPassword = context.passphrase;
            osProfile.windowsConfiguration = windowConfiguration;
        }

        const location: string = nonNullValueAndProp(context.location, 'name');
        const virtualMachineProps: ComputeManagementModels.VirtualMachine = { location, hardwareProfile, storageProfile, networkProfile, osProfile };

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');

        const creatingVm: string = localize('creatingVm', 'Creating new virtual machine "{0}"...', vmName);
        const creatingVmDetails: string = localize(
            'creatingVmDetails',
            'Creating new virtual machine "{0}" with size "{1}" and image "{2}"',
            vmName,
            nonNullProp(hardwareProfile, 'vmSize').replace(/_/g, ' '), // sizes are written with underscores as spaces
            `${nonNullProp(storageProfile, 'imageReference').offer} ${nonNullProp(storageProfile, 'imageReference').sku}`);

        const createdVm: string = localize('creatingVm', 'Created new virtual machine "{0}".', vmName);

        ext.outputChannel.appendLog(creatingVmDetails);
        progress.report({ message: creatingVm });
        context.virtualMachine = await computeClient.virtualMachines.createOrUpdate(rgName, vmName, virtualMachineProps);
        ext.outputChannel.appendLog(createdVm);

        const viewOutput: MessageItem = { title: 'View Output' };
        // Note: intentionally not waiting for the result of this before returning
        window.showInformationMessage(createdVm, viewOutput).then(async (result: MessageItem | undefined) => {
            await callWithTelemetryAndErrorHandling('postCreateVM', async (c: IActionContext) => {
                c.telemetry.properties.dialogResult = result?.title;
                if (result === viewOutput) {
                    ext.outputChannel.show();
                }
            });
        });
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.virtualMachine && !!context.newVirtualMachineName;
    }
}
