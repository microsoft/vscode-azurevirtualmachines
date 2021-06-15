/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from '@azure/arm-compute';
import { AzExtTreeItem, AzureTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, ICreateChildImplContext, LocationListStep, parseError, ResourceGroupCreateStep, SubscriptionTreeItemBase, VerifyProvidersStep } from 'vscode-azureextensionui';
import { getAvailableVMLocations } from '../commands/createVirtualMachine/getAvailableVMLocations';
import { ImageListStep, ubuntu1804LTSImage } from '../commands/createVirtualMachine/ImageListStep';
import { IVirtualMachineWizardContext } from '../commands/createVirtualMachine/IVirtualMachineWizardContext';
import { NetworkInterfaceCreateStep } from '../commands/createVirtualMachine/NetworkInterfaceCreateStep';
import { NetworkSecurityGroupCreateStep } from '../commands/createVirtualMachine/NetworkSecurityGroupCreateStep';
import { OSListStep, VirtualMachineOS } from '../commands/createVirtualMachine/OSListStep';
import { PassphrasePromptStep } from '../commands/createVirtualMachine/PassphrasePromptStep';
import { PublicIpCreateStep } from '../commands/createVirtualMachine/PublicIpCreateStep';
import { SubnetCreateStep } from '../commands/createVirtualMachine/SubnetCreateStep';
import { UsernamePromptStep } from '../commands/createVirtualMachine/UsernamePromptStep';
import { VirtualMachineCreateStep } from '../commands/createVirtualMachine/VirtualMachineCreateStep';
import { VirtualMachineNameStep } from '../commands/createVirtualMachine/VirtualMachineNameStep';
import { VirtualNetworkCreateStep } from '../commands/createVirtualMachine/VirtualNetworkCreateStep';
import { localize } from '../localize';
import { createComputeClient } from '../utils/azureClients';
import { getResourceGroupFromId } from '../utils/azureUtils';
import { nonNullProp } from '../utils/nonNull';
import { configureSshConfig } from '../utils/sshUtils';
import { VirtualMachineTreeItem } from './VirtualMachineTreeItem';

export class SubscriptionTreeItem extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = localize('VirtualMachine', 'Virtual Machine');
    public supportsAdvancedCreation: boolean = true;

    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: ComputeManagementClient = await createComputeClient(this.root);
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
            async (vm: ComputeManagementModels.VirtualMachine) => {
                const instanceView: ComputeManagementModels.VirtualMachineInstanceView = await client.virtualMachines.instanceView(getResourceGroupFromId(nonNullProp(vm, 'id')), nonNullProp(vm, 'name'));
                return new VirtualMachineTreeItem(this, vm, instanceView);
            },
            (vm: ComputeManagementModels.VirtualMachine) => {
                return vm.name;
            }
        );
    }
    public async createChildImpl(context: ICreateChildImplContext): Promise<AzureTreeItem> {
        const size: ComputeManagementModels.VirtualMachineSizeTypes = this.root.isCustomCloud ? 'Standard_DS1_v2' : 'Standard_D2s_v3';
        const wizardContext: IVirtualMachineWizardContext = Object.assign(context, this.root, {
            addressPrefix: '10.1.0.0/24',
            size
        });

        const computeProvider: string = 'Microsoft.Compute';
        LocationListStep.setLocationSubset(wizardContext, getAvailableVMLocations(wizardContext), computeProvider);

        // By default, only prompt for VM and Location. A new RG is made for every VM
        const promptSteps: AzureWizardPromptStep<IVirtualMachineWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IVirtualMachineWizardContext>[] = [];

        promptSteps.push(new VirtualMachineNameStep());
        promptSteps.push(new OSListStep());
        promptSteps.push(new ImageListStep());

        promptSteps.push(new UsernamePromptStep());
        promptSteps.push(new PassphrasePromptStep());
        LocationListStep.addStep(wizardContext, promptSteps);

        executeSteps.push(new ResourceGroupCreateStep());
        executeSteps.push(new PublicIpCreateStep());
        executeSteps.push(new VirtualNetworkCreateStep());
        executeSteps.push(new SubnetCreateStep());
        executeSteps.push(new NetworkSecurityGroupCreateStep());
        executeSteps.push(new NetworkInterfaceCreateStep());
        executeSteps.push(new VirtualMachineCreateStep());
        executeSteps.push(new VerifyProvidersStep([computeProvider, 'Microsoft.Network']));

        const title: string = 'Create new virtual machine';

        if (!context.advancedCreation) {
            // for basic create, default to image Ubuntu 18.04 LTS
            wizardContext.os = VirtualMachineOS.linux;
            wizardContext.image = ubuntu1804LTSImage;
            wizardContext.adminUsername = 'azureuser';
        }

        const wizard: AzureWizard<IVirtualMachineWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title });

        await wizard.prompt();

        context.showCreatingTreeItem(nonNullProp(wizardContext, 'newVirtualMachineName'));
        wizardContext.newResourceGroupName = await wizardContext.relatedNameTask;

        await wizard.execute();

        const virtualMachine: ComputeManagementModels.VirtualMachine = nonNullProp(wizardContext, 'virtualMachine');

        const newVm: VirtualMachineTreeItem = new VirtualMachineTreeItem(this, virtualMachine, undefined /* assume all newly created VMs are running */);
        if (newVm.contextValue === VirtualMachineTreeItem.linuxContextValue) {
            await configureSshConfig(newVm, `~/.ssh/${wizardContext.sshKeyName}`);
        }

        return newVm;
    }
}
