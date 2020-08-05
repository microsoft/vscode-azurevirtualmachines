/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import { NetworkManagementClient, NetworkManagementModels } from '@azure/arm-network';
import * as vscode from 'vscode';
import { AzureParentTreeItem, AzureTreeItem, createAzureClient, DialogResponses } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { getNameFromId, getResourceGroupFromId } from '../utils/azureUtils';
import { nonNullProp, nonNullValueAndProp } from '../utils/nonNull';
import { treeUtils } from '../utils/treeUtils';

export class VirtualMachineTreeItem extends AzureTreeItem {
    public get label(): string {
        return `${this.resourceGroup}/${this.name}`;
    }

    public get iconPath(): treeUtils.IThemedIconPath {
        return treeUtils.getThemedIconPath('Virtual-Machine');
    }

    public get id(): string {
        // https://github.com/microsoft/vscode-azurevirtualmachines/issues/70
        return nonNullProp(this.virtualMachine, 'id').toLowerCase();
    }

    public get name(): string {
        return nonNullProp(this.virtualMachine, 'name');
    }

    public get resourceGroup(): string {
        // https://github.com/microsoft/vscode-azurevirtualmachines/issues/70
        return getResourceGroupFromId(this.id).toLowerCase();
    }

    public get description(): string | undefined {
        return this._state?.toLowerCase() !== 'running' ? this._state : undefined;
    }

    public static contextValue: string = 'azVmVirtualMachine';
    public readonly contextValue: string = VirtualMachineTreeItem.contextValue;
    public virtualMachine: ComputeManagementModels.VirtualMachine;
    public isLinux: boolean;
    private _state?: string;

    public constructor(parent: AzureParentTreeItem, vm: ComputeManagementModels.VirtualMachine, instanceView?: ComputeManagementModels.VirtualMachineInstanceView) {
        super(parent);
        this.virtualMachine = vm;
        this._state = instanceView ? this.getStateFromInstanceView(instanceView) : undefined;
        this.isLinux = !!(vm.osProfile?.linuxConfiguration);
    }

    public getUser(): string {
        return nonNullValueAndProp(this.virtualMachine.osProfile, 'adminUsername');
    }

    public async getHostName(): Promise<string> {
        const networkClient: NetworkManagementClient = createAzureClient(this.root, NetworkManagementClient);
        const rgName: string = getResourceGroupFromId(this.id);

        const networkInterfaces: ComputeManagementModels.NetworkInterfaceReference[] = nonNullValueAndProp(this.virtualMachine.networkProfile, 'networkInterfaces');
        if (networkInterfaces.length === 0) {
            throw new Error(localize('noNicConfigs', 'No network interfaces are associated with "{0}"', this.name));
        }

        const networkInterfaceName: string = getNameFromId(nonNullProp(networkInterfaces[0], 'id'));
        const networkInterface: NetworkManagementModels.NetworkInterface = await networkClient.networkInterfaces.get(rgName, networkInterfaceName);
        if (!networkInterface.ipConfigurations || networkInterface.ipConfigurations.length === 0) {
            throw new Error(localize('noIpConfigs', 'No IP configurations are associated with network interface "{0}"', networkInterface.name));
        }

        const publicIPAddressName: string = getNameFromId(nonNullValueAndProp(networkInterface.ipConfigurations[0].publicIPAddress, 'id'));
        const ip: NetworkManagementModels.PublicIPAddress = await networkClient.publicIPAddresses.get(rgName, publicIPAddressName);
        return nonNullProp(ip, 'ipAddress');
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const confirmMessage: string = localize('deleteConfirmation', 'Are you sure you want to delete "{0}"?', this.name);
        await ext.ui.showWarningMessage(confirmMessage, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);

        const deleting: string = localize('Deleting', 'Deleting "{0}"...', this.name);
        const deleteSucceeded: string = localize('DeleteSucceeded', 'Successfully deleted "{0}".', this.name);
        const computeClient: ComputeManagementClient = createAzureClient(this.root, ComputeManagementClient);

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: deleting }, async (): Promise<void> => {
            ext.outputChannel.appendLog(deleting);
            await computeClient.virtualMachines.deleteMethod(this.resourceGroup, this.name);
            vscode.window.showInformationMessage(deleteSucceeded);
            ext.outputChannel.appendLog(deleteSucceeded);
        });
    }

    public async refreshImpl(): Promise<void> {
        try {
            this._state = await this.getState();
        } catch {
            this._state = undefined;
        }
    }

    public async getState(): Promise<string | undefined> {
        const computeClient: ComputeManagementClient = createAzureClient(this.root, ComputeManagementClient);
        return this.getStateFromInstanceView(await computeClient.virtualMachines.instanceView(this.resourceGroup, this.name));

    }

    private getStateFromInstanceView(instanceView: ComputeManagementModels.VirtualMachineInstanceView): string | undefined {
        const powerState: ComputeManagementModels.InstanceViewStatus | undefined = instanceView.statuses && instanceView.statuses.find((status): boolean => status.code && status.code.toLowerCase().includes('powerstate') ? true : false);
        return powerState && powerState.displayStatus ? powerState.displayStatus.replace(/vm/i, '').trim() : undefined;
    }
}
