/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from 'azure-arm-compute';
import { NetworkManagementModels } from 'azure-arm-network';
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { nonNullProp, nonNullValueAndProp } from '../../utils/nonNull';
import { getSshKey } from "../../utils/sshUtils";
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class VirtualMachineCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 260;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const computeClient: ComputeManagementClient = createAzureClient(context, ComputeManagementClient);
        // tslint:disable-next-line: strict-boolean-expressions
        const hardwareProfile: ComputeManagementModels.HardwareProfile = { vmSize: context.size || 'Standard_D2s_v3' };

        const vmName: string = nonNullProp(context, 'newVirtualMachineName');
        const storageProfile: ComputeManagementModels.StorageProfile = {
            // tslint:disable-next-line: strict-boolean-expressions
            imageReference: context.image || { offer: 'UbuntuServer', publisher: 'Canonical', sku: '18.04-LTS', version: 'latest' },
            osDisk: { name: vmName, createOption: 'fromImage', managedDisk: { storageAccountType: 'Premium_LRS' } }
        };

        const networkInterface: NetworkManagementModels.NetworkInterface = nonNullProp(context, 'networkInterface');
        const networkProfile: ComputeManagementModels.NetworkProfile = { networkInterfaces: [{ id: networkInterface.id }] };

        // tslint:disable-next-line: strict-boolean-expressions
        context.adminUsername = context.adminUsername || 'azureuser';

        const linuxConfiguration: ComputeManagementModels.LinuxConfiguration = {
            disablePasswordAuthentication: true, ssh: {
                publicKeys: [{
                    keyData: await getSshKey(vmName),
                    // because this is a Linux VM, use '/' as path separator rather than using path.join()
                    path: `/home/${context.adminUsername}/.ssh/authorized_keys`
                }]
            }
        };
        const osProfile: ComputeManagementModels.OSProfile = { computerName: vmName, adminUsername: context.adminUsername, linuxConfiguration };

        const location: string = nonNullValueAndProp(context.location, 'name');
        const virtualMachineProps: ComputeManagementModels.VirtualMachine = { location, hardwareProfile, storageProfile, networkProfile, osProfile };

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');

        const creatingVm: string = localize('creatingVm', 'Creating new virtual machine "{0}"...', vmName);
        const creatingVmDetails: string = localize(
            'creatingVmDetails',
            'Creating new virtual "{0}" with size "{1}" and image "{2}"',
            vmName,
            nonNullProp(hardwareProfile, 'vmSize').replace(/_/g, ' '), // sizes are written with underscores as spaces
            `${nonNullProp(storageProfile, 'imageReference').offer} ${nonNullProp(storageProfile, 'imageReference').sku}`);

        const createdVm: string = localize('creatingVm', 'Created new virtual machine "{0}"...', vmName);

        ext.outputChannel.appendLog(creatingVmDetails);
        progress.report({ message: creatingVm });
        context.virtualMachine = await computeClient.virtualMachines.createOrUpdate(rgName, vmName, virtualMachineProps);
        ext.outputChannel.appendLog(createdVm);
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.virtualMachine && !!context.newVirtualMachineName;
    }
}
