/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VirtualMachine, VirtualMachineSizeTypes } from '@azure/arm-compute';
import { LocationListStep, ResourceGroupCreateStep, SubscriptionTreeItemBase, VerifyProvidersStep } from '@microsoft/vscode-azext-azureutils';
import { AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext } from '@microsoft/vscode-azext-utils';
import { getAvailableVMLocations } from '../commands/createVirtualMachine/getAvailableVMLocations';
import { ImageListStep } from '../commands/createVirtualMachine/ImageListStep';
import { IVirtualMachineWizardContext } from '../commands/createVirtualMachine/IVirtualMachineWizardContext';
import { NetworkInterfaceCreateStep } from '../commands/createVirtualMachine/NetworkInterfaceCreateStep';
import { NetworkSecurityGroupCreateStep } from '../commands/createVirtualMachine/NetworkSecurityGroupCreateStep';
import { OSListStep } from '../commands/createVirtualMachine/OSListStep';
import { PassphrasePromptStep } from '../commands/createVirtualMachine/PassphrasePromptStep';
import { PublicIpCreateStep } from '../commands/createVirtualMachine/PublicIpCreateStep';
import { SubnetCreateStep } from '../commands/createVirtualMachine/SubnetCreateStep';
import { UsernamePromptStep } from '../commands/createVirtualMachine/UsernamePromptStep';
import { VirtualMachineCreateStep } from '../commands/createVirtualMachine/VirtualMachineCreateStep';
import { VirtualMachineNameStep } from '../commands/createVirtualMachine/VirtualMachineNameStep';
import { VirtualNetworkCreateStep } from '../commands/createVirtualMachine/VirtualNetworkCreateStep';
import { localize } from '../localize';
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

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        // const client: ComputeManagementClient = await createComputeClient([context, this]);
        // const virtualMachines: VirtualMachine[] = await uiUtils.listAllIterator(client.virtualMachines.listAll());

        // return await this.createTreeItemsWithErrorHandling(
        //     virtualMachines,
        //     'invalidVirtualMachine',
        //     async (vm: VirtualMachine) => {
        //         const instanceView: VirtualMachineInstanceView = await client.virtualMachines.instanceView(getResourceGroupFromId(nonNullProp(vm, 'id')), nonNullProp(vm, 'name'));
        //         return new VirtualMachineTreeItem(this, vm, instanceView);
        //     },
        //     (vm: VirtualMachine) => {
        //         return vm.name;
        //     }
        // );
        return [];
    }
    public async createChildImpl2(context: IActionContext & Partial<IVirtualMachineWizardContext>): Promise<VirtualMachineTreeItem> {
        const size: VirtualMachineSizeTypes = this.subscription.isCustomCloud ? 'Standard_DS1_v2' : 'Standard_D2s_v3';
        const wizardContext: IVirtualMachineWizardContext = Object.assign(context, this.subscription, {
            addressPrefix: '10.1.0.0/24',
            size,
            includeExtendedLocations: true
        });

        const computeProvider: string = 'Microsoft.Compute';
        LocationListStep.setLocationSubset(wizardContext, getAvailableVMLocations(wizardContext), computeProvider);

        // By default, only prompt for VM and Location. A new RG is made for every VM
        const promptSteps: AzureWizardPromptStep<IVirtualMachineWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IVirtualMachineWizardContext>[] = [];

        promptSteps.push(new VirtualMachineNameStep());
        promptSteps.push(new OSListStep());
        const imageListStep = new ImageListStep();
        promptSteps.push(imageListStep);

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
            wizardContext.os = 'Linux';
            wizardContext.imageTask = imageListStep.getDefaultImageReference(wizardContext);
            wizardContext.adminUsername = 'azureuser';
        }

        const wizard: AzureWizard<IVirtualMachineWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title });

        await wizard.prompt();

        // context.showCreatingTreeItem(nonNullProp(wizardContext, 'newVirtualMachineName'));
        wizardContext.newResourceGroupName = await wizardContext.relatedNameTask;

        await wizard.execute();

        const virtualMachine: VirtualMachine = nonNullProp(wizardContext, 'virtualMachine');

        const newVm: VirtualMachineTreeItem = new VirtualMachineTreeItem(this.subscription, virtualMachine, undefined /* assume all newly created VMs are running */);
        if (newVm.contextValuesToAdd.includes(VirtualMachineTreeItem.linuxContextValue)) {
            await configureSshConfig(context, newVm, `~/.ssh/${wizardContext.sshKeyName}`);
        }
        return newVm;
    }
}
