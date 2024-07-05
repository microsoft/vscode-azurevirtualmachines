/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type VirtualMachine, type VirtualMachineSizeTypes } from "@azure/arm-compute";
import { LocationListStep, ResourceGroupCreateStep, SubscriptionTreeItemBase, VerifyProvidersStep } from "@microsoft/vscode-azext-azureutils";
import { AzureWizard, nonNullProp, type AzureWizardExecuteStep, type AzureWizardPromptStep, type IActionContext, type ICreateChildImplContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { VirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { createActivityContext } from "../../utils/activityUtils";
import { configureSshConfig } from "../../utils/sshUtils";
import { type IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";
import { ImageListStep } from "./ImageListStep";
import { NetworkInterfaceCreateStep } from "./NetworkInterfaceCreateStep";
import { NetworkSecurityGroupCreateStep } from "./NetworkSecurityGroupCreateStep";
import { OSListStep } from "./OSListStep";
import { PublicIpCreateStep } from "./PublicIpCreateStep";
import { SubnetCreateStep } from "./SubnetCreateStep";
import { UsernamePromptStep } from "./UsernamePromptStep";
import { VirtualMachineCreateStep } from "./VirtualMachineCreateStep";
import { VirtualMachineNameStep } from "./VirtualMachineNameStep";
import { VirtualNetworkCreateStep } from "./VirtualNetworkCreateStep";
import { getAvailableVMLocations } from "./getAvailableVMLocations";

export async function createVirtualMachine(context: IActionContext & Partial<ICreateChildImplContext>, node?: SubscriptionTreeItemBase | undefined): Promise<VirtualMachineTreeItem> {
    if (!node) {
        node = await ext.rgApi.appResourceTree.showTreeItemPicker<SubscriptionTreeItemBase>(SubscriptionTreeItemBase.contextValue, context);
    }

    const size: VirtualMachineSizeTypes = node.subscription.isCustomCloud ? 'Standard_DS1_v2' : 'Standard_D2s_v3';
    const wizardContext: IVirtualMachineWizardContext = Object.assign(context, node.subscription, {
        addressPrefix: '10.1.0.0/24',
        size,
        includeExtendedLocations: true,
        ...(await createActivityContext())
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

    wizardContext.newResourceGroupName = await wizardContext.relatedNameTask;

    wizardContext.activityTitle = localize('createVirtualMachine', 'Create virtual machine "{0}"', nonNullProp(wizardContext, 'newVirtualMachineName'));

    await wizard.execute();
    await ext.rgApi.appResourceTree.refresh(context);

    const virtualMachine: VirtualMachine = nonNullProp(wizardContext, 'virtualMachine');

    const newVm: VirtualMachineTreeItem = new VirtualMachineTreeItem(node.subscription, virtualMachine);
    if (newVm.contextValuesToAdd.includes(VirtualMachineTreeItem.linuxContextValue)) {
        await configureSshConfig(context, newVm, `~/.ssh/${wizardContext.sshKeyName}`);
    }

    return newVm;
}

export async function createVirtualMachineAdvanced(context: IActionContext, node?: SubscriptionTreeItemBase | undefined): Promise<VirtualMachineTreeItem> {
    return await createVirtualMachine({ ...context, advancedCreation: true }, node);
}
