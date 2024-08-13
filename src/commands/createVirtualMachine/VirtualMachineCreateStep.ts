/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type ComputeManagementClient, type HardwareProfile, type LinuxConfiguration, type NetworkProfile, type OSProfile, type StorageProfile, type VirtualMachine, type WindowsConfiguration } from '@azure/arm-compute';
import { type NetworkInterface } from '@azure/arm-network';
import { LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { callWithTelemetryAndErrorHandling, nonNullProp, nonNullValueAndProp, type IActionContext } from "@microsoft/vscode-azext-utils";
import { window, type MessageItem, type Progress } from "vscode";
import { viewOutput } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createComputeClient } from '../../utils/azureClients';
import { createSshKey } from '../../utils/sshUtils';
import { AzureWizardActivityOutputExecuteStep } from '../AzureWizardActivityOutputExecuteStep';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class VirtualMachineCreateStep extends AzureWizardActivityOutputExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 260;
    stepName: string = 'virtualMachineCreateStep';

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const newLocation = await LocationListStep.getLocation(context, undefined, true);
        const { location, extendedLocation } = LocationListStep.getExtendedLocation(newLocation);

        context.telemetry.properties.os = context.os;
        context.telemetry.properties.location = location;
        context.telemetry.properties.size = context.size;

        const computeClient: ComputeManagementClient = await createComputeClient(context);
        const hardwareProfile: HardwareProfile = { vmSize: context.size };

        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        context.image ||= await context.imageTask;

        const storageProfile: StorageProfile = {
            imageReference: context.image,
            osDisk: {
                name: vmName,
                createOption: 'FromImage',
                managedDisk: { storageAccountType: context.isCustomCloud ? 'Standard_LRS' : 'Premium_LRS' }
            }
        };

        const networkInterface: NetworkInterface = nonNullProp(context, 'networkInterface');
        const networkProfile: NetworkProfile = { networkInterfaces: [{ id: networkInterface.id }] };

        const osProfile: OSProfile = { computerName: vmName, adminUsername: context.adminUsername };
        if (context.os === 'Linux') {
            const { sshKeyName, keyData } = await createSshKey(context, vmName, context.passphrase || '');
            context.sshKeyName = sshKeyName;
            const linuxConfiguration: LinuxConfiguration = {
                disablePasswordAuthentication: true, ssh: {
                    publicKeys: [{
                        keyData,
                        // because this is a Linux VM, use '/' as path separator rather than using path.join()
                        path: `/home/${context.adminUsername}/.ssh/authorized_keys`
                    }]
                }
            };
            osProfile.linuxConfiguration = linuxConfiguration;
        } else {
            osProfile.adminPassword = context.passphrase;
            const windowConfiguration: WindowsConfiguration = {};
            osProfile.windowsConfiguration = windowConfiguration;
        }

        const virtualMachineProps: VirtualMachine = { location, extendedLocation, hardwareProfile, storageProfile, networkProfile, osProfile };

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');

        const creatingVmDetails: string = localize(
            'creatingVmDetails',
            'Creating new virtual machine "{0}" with size "{1}" and image "{2}"',
            vmName,
            nonNullProp(hardwareProfile, 'vmSize').replace(/_/g, ' '), // sizes are written with underscores as spaces
            `${nonNullProp(storageProfile, 'imageReference').offer} ${nonNullProp(storageProfile, 'imageReference').sku}`);

        ext.outputChannel.appendLog(creatingVmDetails);
        progress.report({ message: this.getProgressString(context) });
        context.virtualMachine = await computeClient.virtualMachines.beginCreateOrUpdateAndWait(rgName, vmName, virtualMachineProps);

        context.activityResult = {
            id: nonNullProp(context.virtualMachine, 'id'),
            name: nonNullProp(context.virtualMachine, 'name'),
            type: nonNullProp(context.virtualMachine, 'type'),
        };

        ext.outputChannel.appendLog(this.getSuccessString(context));

        // Note: intentionally not waiting for the result of this before returning
        void window.showInformationMessage(this.getSuccessString(context), viewOutput).then(async (result: MessageItem | undefined) => {
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

    public getSuccessString(context: IVirtualMachineWizardContext): string {
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        return localize('createdVm', 'Created new virtual machine "{0}".', vmName);
    }

    public getProgressString(context: IVirtualMachineWizardContext): string {
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        return localize('creatingVm', 'Creating new virtual machine "{0}".', vmName);
    }

    protected getFailString(context: IVirtualMachineWizardContext): string {
        return this.getSuccessString(context);
    }
}
