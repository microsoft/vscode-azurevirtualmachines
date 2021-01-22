/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import { NetworkManagementClient, NetworkManagementModels } from '@azure/arm-network';
import * as vscode from 'vscode';
import { AzureParentTreeItem, AzureTreeItem, IActionContext, parseError } from 'vscode-azureextensionui';
import { deleteAllResources } from '../commands/deleteVirtualMachine/deleteAllResources';
import { IDeleteChildImplContext, ResourceDeleteError, ResourceToDelete } from '../commands/deleteVirtualMachine/deleteConstants';
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

    public async deleteTreeItemImpl(context: IDeleteChildImplContext): Promise<void> {
        const multiDelete: boolean = context.resourcesToDelete.length > 1;
        const resourcesToDelete: ResourceToDelete[] = context.resourcesToDelete;

        const deleting: string = multiDelete ? localize('Deleting', 'Deleting {0}...', context.resourceList) :
            localize('Deleting', 'Deleting {0} "{1}"...', resourcesToDelete[0].resourceType, resourcesToDelete[0].resourceName);

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: deleting }, async (): Promise<void> => {
            if (multiDelete) { ext.outputChannel.appendLog(deleting); }

            // the message needs to constructed here since resourcesToDelete gets spliced
            const deleteSucceeded: string = multiDelete ? localize('DeleteSucceeded', 'Successfully deleted {0}.', context.resourceList) :
                localize('DeleteSucceeded', 'Successfully deleted {0} "{1}".', resourcesToDelete[0].resourceType, resourcesToDelete[0].resourceName);

            const errors: ResourceDeleteError[] = await deleteAllResources(this.root, this.resourceGroup, resourcesToDelete);

            const formattedErrors: string = errors.map(err => '\n' + parseError(err.error).message).join(',');
            const outputDeleteWithErrors: string = localize('outputDeleteWithErrors', `Failed to delete resources with the following errors: ${formattedErrors}`);
            const messageDeleteWithErrors: string = localize(
                'messageDeleteWithErrors',
                `Failed to delete the following resources ${errors.map(err => `"${err.resource.resourceName}"`).join(',')}. Check the output channel for more information.`);

            if (multiDelete) { ext.outputChannel.appendLog(errors.length > 0 ? outputDeleteWithErrors : deleteSucceeded); }
            vscode.window.showInformationMessage(errors.length > 0 ? messageDeleteWithErrors : deleteSucceeded);
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
