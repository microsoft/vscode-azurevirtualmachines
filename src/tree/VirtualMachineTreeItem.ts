/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import { NetworkManagementClient, NetworkManagementModels } from '@azure/arm-network';
import * as vscode from 'vscode';
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { deleteAllResources, getResourcesToDelete, promptResourcesToDelete, resourceToDelete } from '../commands/deleteVmAssociatedResources';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { createComputeClient, createNetworkClient } from '../utils/azureClients';
import { getNameFromId, getResourceGroupFromId } from '../utils/azureUtils';
import { nonNullProp, nonNullValueAndProp } from '../utils/nonNull';
import { treeUtils } from '../utils/treeUtils';

export class VirtualMachineTreeItem extends AzureTreeItem {
    public get label(): string {
        return `${this.name}`;
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

    public get data(): ComputeManagementModels.VirtualMachine {
        return this.virtualMachine;
    }

    public static linuxContextValue: string = 'linuxVirtualMachine';
    public static windowsContextValue: string = 'windowsVirtualMachine';
    public static allOSContextValue: RegExp = /VirtualMachine$/;

    public contextValue: string;
    public virtualMachine: ComputeManagementModels.VirtualMachine;
    public isLinux: boolean;
    private _state?: string;

    public constructor(parent: AzureParentTreeItem, vm: ComputeManagementModels.VirtualMachine, instanceView?: ComputeManagementModels.VirtualMachineInstanceView) {
        super(parent);
        this.virtualMachine = vm;
        this._state = instanceView ? this.getStateFromInstanceView(instanceView) : undefined;
        this.contextValue = !!(vm.osProfile?.linuxConfiguration) ? VirtualMachineTreeItem.linuxContextValue : VirtualMachineTreeItem.windowsContextValue;
    }

    public getUser(): string {
        return nonNullValueAndProp(this.virtualMachine.osProfile, 'adminUsername');
    }

    public async getIpAddress(): Promise<string> {
        const networkClient: NetworkManagementClient = await createNetworkClient(this.root);
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
        const deleteAll: vscode.MessageItem = { title: localize('deleteAll', 'Delete with associated resources') };
        const result: vscode.MessageItem = await ext.ui.showWarningMessage(confirmMessage, { modal: true }, DialogResponses.deleteResponse, deleteAll, DialogResponses.cancel);

        const deleting: string = result === deleteAll ? localize('Deleting', 'Deleting virtual machine "{0}" and selected associated resources...', this.name) : localize('Deleting', 'Deleting virtual machine "{0}"...', this.name);
        let resourcesToDelete: IAzureQuickPickItem<resourceToDelete>[] | undefined;

        if (result === deleteAll) {
            // if we can't retrieve the disk name, it's highly likely that it's the same as the vmName if it was created from the extension
            const diskName: string = this.data.storageProfile?.osDisk?.managedDisk?.id ? getNameFromId(this.data.storageProfile.osDisk.managedDisk.id) : this.name;

            const networkNames: string[] = [];
            if (this.data.networkProfile && this.data.networkProfile.networkInterfaces) {
                for (const networkRef of this.data.networkProfile?.networkInterfaces) {
                    networkNames.push(getNameFromId(nonNullProp(networkRef, 'id')));
                }

            }
            const associatedResources: resourceToDelete[] = await getResourcesToDelete(this.root, this.resourceGroup, networkNames, diskName);
            resourcesToDelete = await promptResourcesToDelete(this.name, associatedResources);
        }

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: deleting }, async (): Promise<void> => {
            ext.outputChannel.appendLog(deleting);
            const computeClient: ComputeManagementClient = await createComputeClient(this.root);
            await computeClient.virtualMachines.deleteMethod(this.resourceGroup, this.name);

            if (resourcesToDelete) {
                await deleteAllResources(this.root, this.resourceGroup, resourcesToDelete);
            }

            const deleteSucceeded: string = result === deleteAll ? localize('DeleteSucceeded', 'Successfully deleted virtual machine "{0}" and selected associated resources.', this.name) : localize('DeleteSucceeded', 'Successfully deleted virtual machine "{0}".', this.name);
            ext.outputChannel.appendLog(deleteSucceeded);
            vscode.window.showInformationMessage(deleteSucceeded);
        });
    }

    public async refreshImpl(_context: IActionContext): Promise<void> {
        try {
            this._state = await this.getState();
        } catch {
            this._state = undefined;
        }

    }

    public async getState(): Promise<string | undefined> {
        const computeClient: ComputeManagementClient = await createComputeClient(this.root);
        return this.getStateFromInstanceView(await computeClient.virtualMachines.instanceView(this.resourceGroup, this.name));
    }

    private getStateFromInstanceView(instanceView: ComputeManagementModels.VirtualMachineInstanceView): string | undefined {
        const powerState: ComputeManagementModels.InstanceViewStatus | undefined = instanceView.statuses && instanceView.statuses.find((status): boolean => status.code && status.code.toLowerCase().includes('powerstate') ? true : false);
        return powerState && powerState.displayStatus ? powerState.displayStatus.replace(/vm/i, '').trim() : undefined;
    }
}
