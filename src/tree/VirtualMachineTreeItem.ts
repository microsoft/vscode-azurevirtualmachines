/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementModels } from 'azure-arm-compute';
import NetworkManagementClient, { NetworkManagementModels } from 'azure-arm-network';
import { AzureParentTreeItem, AzureTreeItem, createAzureClient } from 'vscode-azureextensionui';
import { localize } from '../localize';
import { getNameFromId, getResourceGroupFromId } from '../utils/azureUtils';
import { nonNullProp, nonNullValueAndProp } from '../utils/nonNull';
import { treeUtils } from '../utils/treeUtils';

export class VirtualMachineTreeItem extends AzureTreeItem {
    public get label(): string {
        return `${getResourceGroupFromId(this.id).toLocaleLowerCase()}/${this.name}`;
    }

    public get iconPath(): treeUtils.IThemedIconPath {
        return treeUtils.getThemedIconPath('AzureVm');
    }

    public get id(): string {
        return nonNullProp(this.virtualMachine, 'id');
    }

    public get name(): string {
        return nonNullProp(this.virtualMachine, 'name');
    }

    public static contextValue: string = 'azVmVirtualMachine';
    public readonly contextValue: string = VirtualMachineTreeItem.contextValue;
    public virtualMachine: ComputeManagementModels.VirtualMachine;
    public vmName: string;

    public constructor(parent: AzureParentTreeItem, vm: ComputeManagementModels.VirtualMachine) {
        super(parent);
        this.virtualMachine = vm;
    }

    public getUser(): string {
        return nonNullValueAndProp(this.virtualMachine.osProfile, 'adminUsername');
    }

    public async getHostName(): Promise<string> {
        const networkClient: NetworkManagementClient = createAzureClient(this.root, NetworkManagementClient);
        const rgName: string = getResourceGroupFromId(this.id);

        const networkInterfaces: ComputeManagementModels.NetworkInterfaceReference[] = nonNullValueAndProp(this.virtualMachine.networkProfile, 'networkInterfaces');
        if (networkInterfaces.length === 0) {
            throw new Error();
        }

        const networkInterfaceName: string = getNameFromId(nonNullProp(networkInterfaces[0], 'id'));
        const networkInterface: NetworkManagementModels.NetworkInterface = await networkClient.networkInterfaces.get(rgName, networkInterfaceName);
        if (!networkInterface.ipConfigurations || networkInterface.ipConfigurations.length === 0) {
            const noIpConfigs: string = localize('noIpConfigs', 'No IP configurations are associated with network interface "{0}"', networkInterface.name);
            throw new Error(noIpConfigs);
        }

        const publicIPAddressName: string = getNameFromId(nonNullValueAndProp(networkInterface.ipConfigurations[0].publicIPAddress, 'id'));
        const ip: NetworkManagementModels.PublicIPAddress = await networkClient.publicIPAddresses.get(rgName, publicIPAddressName);
        return nonNullProp(ip, 'ipAddress');
    }
}
