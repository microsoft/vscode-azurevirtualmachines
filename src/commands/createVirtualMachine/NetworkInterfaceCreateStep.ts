/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkManagementClient, NetworkManagementModels } from 'azure-arm-network';
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { nonNullProp, nonNullValueAndProp } from '../../utils/nonNull';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class NetworkInterfaceCreateStep extends AzureWizardExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 240;

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = createAzureClient(context, NetworkManagementClient);
        const location: string = nonNullValueAndProp(context.location, 'name');
        const vmName: string = nonNullProp(context, 'newVirtualMachineName');

        // this is the naming convention used by the portal
        context.newNetworkInterfaceName = context.newNetworkInterfaceName || this.appendThreeRandomDigits(vmName);

        const publicIpAddress: NetworkManagementModels.PublicIPAddress = nonNullProp(context, 'publicIpAddress');
        const subnet: NetworkManagementModels.Subnet = nonNullProp(context, 'subnet');

        const networkInterfaceProps: NetworkManagementModels.NetworkInterface = {
            location, ipConfigurations: [{ name: context.newNetworkInterfaceName, publicIPAddress: publicIpAddress, subnet: subnet }]
        };

        const creatingNi: string = localize('creatingNi', `Creating network interface "${context.newNetworkInterfaceName}"...`);
        const createdNi: string = localize('createdNi', `Created network interface "${context.newNetworkInterfaceName}".`);
        progress.report({ message: creatingNi });
        ext.outputChannel.appendLog(creatingNi);

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        context.networkInterface = await networkClient.networkInterfaces.createOrUpdate(rgName, context.newNetworkInterfaceName, networkInterfaceProps);
        ext.outputChannel.appendLog(createdNi);
    }
    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.networkInterface;
    }

    private appendThreeRandomDigits(niName: string): string {
        for (let i: number = 0; i < 3; i += 1) {
            // as this isn't being used for security purposes, it should be sufficient to use Math.random()
            // tslint:disable-next-line: insecure-random
            niName += Math.round(Math.random() * 9);
        }

        return niName;
    }

}
