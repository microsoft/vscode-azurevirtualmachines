/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, InstanceViewStatus, NetworkInterfaceReference, VirtualMachine, VirtualMachineInstanceView } from '@azure/arm-compute';
import { NetworkInterface, NetworkManagementClient, PublicIPAddress } from '@azure/arm-network';
import { getResourceGroupFromId } from '@microsoft/vscode-azext-azureutils';
import { AzExtTreeItem, AzureWizard, IActionContext, ISubscriptionContext, nonNullProp, nonNullValueAndProp } from '@microsoft/vscode-azext-utils';
import { ResolvedAppResourceBase, ResolvedAppResourceTreeItem } from '@microsoft/vscode-azext-utils/hostapi';
import { ViewPropertiesModel } from '@microsoft/vscode-azureresources-api';
import { ConfirmDeleteStep } from '../commands/deleteVirtualMachine/ConfirmDeleteStep';
import { DeleteVirtualMachineStep } from '../commands/deleteVirtualMachine/DeleteVirtualMachineStep';
import { SelectResourcesToDeleteStep } from '../commands/deleteVirtualMachine/SelectResourcesToDeleteStep';
import { IDeleteChildImplContext, ResourceToDelete } from '../commands/deleteVirtualMachine/deleteConstants';
import { localize } from '../localize';
import { createActivityContext } from '../utils/activityUtils';
import { createComputeClient, createNetworkClient } from '../utils/azureClients';
import { getNameFromId } from '../utils/azureUtils';
import { treeUtils } from '../utils/treeUtils';

export interface ResolvedVirtualMachine extends ResolvedAppResourceBase {
    data: VirtualMachine;
    resourceGroup: string;
    getIpAddress(context: IActionContext): Promise<string>;
    getUser(): string;
    label: string;
    name: string;
}

export type ResolvedVirtualMachineTreeItem = ResolvedAppResourceTreeItem<ResolvedVirtualMachine> & AzExtTreeItem;

export class VirtualMachineTreeItem implements ResolvedVirtualMachine {
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

    public get viewProperties(): ViewPropertiesModel {
        return {
            data: this.virtualMachine,
            label: this.name,
        }
    }

    public static linuxContextValue: string = 'linuxVirtualMachine';
    public static windowsContextValue: string = 'windowsVirtualMachine';
    public static allOSContextValue: RegExp = /VirtualMachine$/;

    public contextValuesToAdd: string[] = [];
    public virtualMachine: VirtualMachine;

    private _state?: string;

    public constructor(private readonly _subscription: ISubscriptionContext, vm: VirtualMachine) {
        this.virtualMachine = vm;
        this._state = vm.instanceView ? this.getStateFromInstanceView(vm.instanceView) : undefined;
        this.contextValuesToAdd = vm.osProfile?.linuxConfiguration ? [VirtualMachineTreeItem.linuxContextValue] : [VirtualMachineTreeItem.windowsContextValue];
    }

    public getUser(): string {
        return nonNullValueAndProp(this.virtualMachine.osProfile, 'adminUsername');
    }

    public async getIpAddress(context: IActionContext): Promise<string> {
        const networkClient: NetworkManagementClient = await createNetworkClient([context, this._subscription]);
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

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {

        const wizardContext: IDeleteChildImplContext = Object.assign(context, {
            node: this as ResolvedVirtualMachineTreeItem,
            ...(await createActivityContext()),
        });

        const wizard = new AzureWizard<IDeleteChildImplContext>(wizardContext, {
            promptSteps: [new SelectResourcesToDeleteStep(), new ConfirmDeleteStep()],
            executeSteps: [new DeleteVirtualMachineStep()],
        });

        await wizard.prompt();

        const resourcesToDelete: ResourceToDelete[] = nonNullProp(wizardContext, 'resourcesToDelete');
        const multiDelete: boolean = resourcesToDelete.length > 1;

        wizardContext.activityTitle = multiDelete ? localize('delete', 'Delete {0}...', wizardContext.resourceList) :
            localize('delete', 'Delete {0} "{1}"...', resourcesToDelete[0].resourceType, resourcesToDelete[0].resourceName);

        await wizard.execute();
    }

    public async refreshImpl(context: IActionContext): Promise<void> {
        try {
            this._state = await this.getState(context);
        } catch {
            this._state = undefined;
        }
    }

    public async getState(context: IActionContext): Promise<string | undefined> {
        const computeClient: ComputeManagementClient = await createComputeClient([context, this._subscription]);
        return this.getStateFromInstanceView(await computeClient.virtualMachines.instanceView(this.resourceGroup, this.name));
    }

    private getStateFromInstanceView(instanceView: VirtualMachineInstanceView): string | undefined {
        const powerState: InstanceViewStatus | undefined = instanceView.statuses && instanceView.statuses.find((status): boolean => status.code && status.code.toLowerCase().includes('powerstate') ? true : false);
        return powerState && powerState.displayStatus ? powerState.displayStatus.replace(/vm/i, '').trim() : undefined;
    }
}
