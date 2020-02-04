/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from 'azure-arm-compute';
import { AzExtTreeItem, AzureTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, createAzureClient, ICreateChildImplContext, LocationListStep, parseError, ResourceGroupListStep, SubscriptionTreeItemBase } from 'vscode-azureextensionui';
import { IVirtualMachineWizardContext } from '../commands/createVirtualMachine/IVirtualMachineWizardContext';
import { NetworkInterfaceCreateStep } from '../commands/createVirtualMachine/NetworkInterfaceCreateStep';
import { NetworkSecurityGroupCreateStep } from '../commands/createVirtualMachine/NetworkSecurityGroupCreateStep';
import { PublicIpCreateStep } from '../commands/createVirtualMachine/PublicIpCreateStep';
import { SubnetCreateStep } from '../commands/createVirtualMachine/SubnetCreateStep';
import { VirtualMachineCreateStep } from '../commands/createVirtualMachine/VirtualMachineCreateStep';
import { VirtualMachineNameStep } from '../commands/createVirtualMachine/VirtualMachineNameStep';
import { VirtualNetworkCreateStep } from '../commands/createVirtualMachine/VirtualNetworkCreateStep';
import { ext } from '../extensionVariables';
import { nonNullProp } from '../utils/nonNull';
import { configureSshConfig } from '../utils/sshUtils';
import { VirtualMachineTreeItem } from './VirtualMachineTreeItem';

export class SubscriptionTreeItem extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = 'azVmVirtualMachine';

    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: ComputeManagementClient = createAzureClient(this.root, ComputeManagementClient);
        let virtualMachines: ComputeManagementModels.VirtualMachineListResult;

        try {
            virtualMachines = this._nextLink === undefined ?
                await client.virtualMachines.listAll() :
                await client.virtualMachines.listNext(this._nextLink);
        } catch (error) {
            if (parseError(error).errorType.toLowerCase() === 'notfound') {
                // This error type means the 'Microsoft.Web' provider has not been registered in this subscription
                // In that case, we know there are no web apps, so we can return an empty array
                // (The provider will be registered automatically if the user creates a new web app)
                return [];
            } else {
                throw error;
            }
        }

        this._nextLink = virtualMachines.nextLink;

        return await this.createTreeItemsWithErrorHandling(
            virtualMachines,
            'invalidVirtualMachine',
            (vm: ComputeManagementModels.VirtualMachine) => {
                return new VirtualMachineTreeItem(this, vm);
            },
            (vm: ComputeManagementModels.VirtualMachine) => {
                return vm.name;
            }
        );
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzureTreeItem> {
        const wizardContext: IVirtualMachineWizardContext = Object.assign(context, this.root, {
            resourceGroupDeferLocationStep: true,
            addressPrefix: '10.1.0.0/24'
        });

        // prompt for resourceGroup, VM name, and location
        const promptSteps: AzureWizardPromptStep<IVirtualMachineWizardContext>[] = [];
        promptSteps.push(new ResourceGroupListStep());
        promptSteps.push(new VirtualMachineNameStep());
        LocationListStep.addStep(wizardContext, promptSteps);

        // create a disk, publicIp, virtualNetwork, subnet, networkInterface, networkSecurityGroup (this has the security rules), and then virtuaMachine
        const executeSteps: AzureWizardExecuteStep<IVirtualMachineWizardContext>[] = [];
        // executeSteps.push(new DiskCreateStep());
        executeSteps.push(new PublicIpCreateStep());
        executeSteps.push(new VirtualNetworkCreateStep());
        executeSteps.push(new SubnetCreateStep());
        executeSteps.push(new NetworkInterfaceCreateStep());
        executeSteps.push(new NetworkSecurityGroupCreateStep());
        executeSteps.push(new VirtualMachineCreateStep());

        const title: string = 'Create new virtual machine';
        const wizard: AzureWizard<IVirtualMachineWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title });

        await wizard.prompt();

        context.showCreatingTreeItem(nonNullProp(wizardContext, 'newVirtualMachineName'));

        await wizard.execute();

        const virtualMachine: ComputeManagementModels.VirtualMachine = nonNullProp(wizardContext, 'virtualMachine');
        // context.telemetry.properties.vm = virtualMachine.name;

        const createNewVmMsg: string = `Created new virtual machine "${virtualMachine.name}".`;
        ext.outputChannel.appendLine(createNewVmMsg);

        const newVm: VirtualMachineTreeItem = new VirtualMachineTreeItem(this, virtualMachine);
        await configureSshConfig(newVm);

        return newVm;
    }
}
