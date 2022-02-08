/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, InstanceViewStatus, NetworkInterfaceReference, VirtualMachine, VirtualMachineInstanceView } from '@azure/arm-compute';
import { NetworkInterface, NetworkManagementClient, PublicIPAddress } from '@azure/arm-network';
import { AzExtErrorButton, AzExtParentTreeItem, AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { deleteAllResources } from '../commands/deleteVirtualMachine/deleteAllResources';
import { IDeleteChildImplContext, ResourceToDelete } from '../commands/deleteVirtualMachine/deleteConstants';
import { viewOutput, virtualMachineLabel } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { createComputeClient, createNetworkClient } from '../utils/azureClients';
import { getNameFromId, getResourceGroupFromId } from '../utils/azureUtils';
import { nonNullProp, nonNullValueAndProp } from '../utils/nonNull';
import { treeUtils } from '../utils/treeUtils';

export class VirtualMachineTreeItem extends AzExtTreeItem {
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

    public get data(): VirtualMachine {
        return this.virtualMachine;
    }

    public static linuxContextValue: string = 'linuxVirtualMachine';
    public static windowsContextValue: string = 'windowsVirtualMachine';
    public static allOSContextValue: RegExp = /VirtualMachine$/;

    public contextValue: string;
    public virtualMachine: VirtualMachine;
    private _state?: string;

    public constructor(parent: AzExtParentTreeItem, vm: VirtualMachine, instanceView?: VirtualMachineInstanceView) {
        super(parent);
        this.virtualMachine = vm;
        this._state = instanceView ? this.getStateFromInstanceView(instanceView) : undefined;
        this.contextValue = vm.osProfile?.linuxConfiguration ? VirtualMachineTreeItem.linuxContextValue : VirtualMachineTreeItem.windowsContextValue;
    }

    public getUser(): string {
        return nonNullValueAndProp(this.virtualMachine.osProfile, 'adminUsername');
    }

    public async getIpAddress(context: IActionContext): Promise<string> {
        const networkClient: NetworkManagementClient = await createNetworkClient([context, this]);
        const rgName: string = getResourceGroupFromId(this.id);

        const networkInterfaces: NetworkInterfaceReference[] = nonNullValueAndProp(this.virtualMachine.networkProfile, 'networkInterfaces');
        if (networkInterfaces.length === 0) {
            throw new Error(localize('noNicConfigs', 'No network interfaces are associated with "{0}"', this.name));
        }

        const networkInterfaceName: string = getNameFromId(nonNullProp(networkInterfaces[0], 'id'));
        const networkInterface: NetworkInterface = await networkClient.networkInterfaces.get(rgName, networkInterfaceName);
        if (!networkInterface.ipConfigurations || networkInterface.ipConfigurations.length === 0) {
            throw new Error(localize('noIpConfigs', 'No IP configurations are associated with network interface "{0}"', networkInterface.name));
        }

        const publicIPAddressName: string = getNameFromId(nonNullValueAndProp(networkInterface.ipConfigurations[0].publicIPAddress, 'id'));
        const ip: PublicIPAddress = await networkClient.publicIPAddresses.get(rgName, publicIPAddressName);
        return nonNullProp(ip, 'ipAddress');
    }

    public async deleteTreeItemImpl(context: IDeleteChildImplContext): Promise<void> {
        const multiDelete: boolean = context.resourcesToDelete.length > 1;
        const resourcesToDelete: ResourceToDelete[] = context.resourcesToDelete;

        const deleting: string = multiDelete ? localize('Deleting', 'Deleting {0}...', context.resourceList) :
            localize('Deleting', 'Deleting {0} "{1}"...', resourcesToDelete[0].resourceType, resourcesToDelete[0].resourceName);

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `${deleting} Check the [output channel](command:${ext.prefix}.showOutputChannel) for status.` }, async (): Promise<void> => {
            if (multiDelete) { ext.outputChannel.appendLog(deleting); }

            const failedResources: ResourceToDelete[] = await deleteAllResources(context, this.subscription, this.resourceGroup, resourcesToDelete);
            const failedResourceList: string = failedResources.map(r => `"${r.resourceName}"`).join(', ');

            const messageDeleteWithErrors: string = localize(
                'messageDeleteWithErrors',
                'Failed to delete the following resources: {0}.', failedResourceList);

            const deleteSucceeded: string = multiDelete ? localize('DeleteSucceeded', 'Successfully deleted {0}.', context.resourceList) :
                localize('DeleteSucceeded', 'Successfully deleted {0} "{1}".', resourcesToDelete[0].resourceType, resourcesToDelete[0].resourceName);

            // single resources are already displayed in the output channel
            if (multiDelete) { ext.outputChannel.appendLog(failedResources.length > 0 ? messageDeleteWithErrors : deleteSucceeded); }
            if (failedResources.length > 0) {
                context.telemetry.properties.failedResources = failedResources.length.toString();
                // if the vm failed to delete or was not being deleted, we want to throw an error to make sure that the node is not removed from the tree
                if (failedResources.some(r => r.resourceType === virtualMachineLabel) || !context.deleteVm) {
                    // tslint:disable-next-line: no-floating-promises
                    const viewOutputAzureButton: AzExtErrorButton = { title: viewOutput.title, callback: async (): Promise<void> => ext.outputChannel.show() };
                    context.errorHandling.buttons = [viewOutputAzureButton];
                    throw new Error(messageDeleteWithErrors);
                }

                void context.ui.showWarningMessage(`${messageDeleteWithErrors} Check the [output channel](command:${ext.prefix}.showOutputChannel) for more information.`);
            } else {
                void vscode.window.showInformationMessage(deleteSucceeded);
            }
        });
    }

    public async refreshImpl(context: IActionContext): Promise<void> {
        try {
            this._state = await this.getState(context);
        } catch {
            this._state = undefined;
        }

    }

    public async getState(context: IActionContext): Promise<string | undefined> {
        const computeClient: ComputeManagementClient = await createComputeClient([context, this]);
        return this.getStateFromInstanceView(await computeClient.virtualMachines.instanceView(this.resourceGroup, this.name));
    }

    private getStateFromInstanceView(instanceView: VirtualMachineInstanceView): string | undefined {
        const powerState: InstanceViewStatus | undefined = instanceView.statuses && instanceView.statuses.find((status): boolean => status.code && status.code.toLowerCase().includes('powerstate') ? true : false);
        return powerState && powerState.displayStatus ? powerState.displayStatus.replace(/vm/i, '').trim() : undefined;
    }
}
