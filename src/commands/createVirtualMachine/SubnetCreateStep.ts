/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type NetworkManagementClient, type Subnet } from '@azure/arm-network';
import { nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { type Progress } from "vscode";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createNetworkClient } from '../../utils/azureClients';
import { AzureWizardActivityOutputExecuteStep } from '../AzureWizardActivityOutputExecuteStep';
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export class SubnetCreateStep extends AzureWizardActivityOutputExecuteStep<IVirtualMachineWizardContext> {
    public priority: number = 240;
    private _subnetName: string = 'default';
    stepName: string = 'subnetCreateStep';

    public async execute(context: IVirtualMachineWizardContext, progress: Progress<{ message?: string | undefined; increment?: number | undefined }>): Promise<void> {
        const networkClient: NetworkManagementClient = await createNetworkClient(context);

        const rgName: string = nonNullValueAndProp(context.resourceGroup, 'name');
        const vnetName: string = nonNullValueAndProp(context.virtualNetwork, 'name');
        // this is the name the portal uses

        const subnetProps: Subnet = { addressPrefix: nonNullProp(context, 'addressPrefix'), name: this._subnetName, networkSecurityGroup: context.networkSecurityGroup };

        progress.report({ message: this.getProgressString() });
        ext.outputChannel.appendLog(this.getProgressString());

        await networkClient.subnets.beginCreateOrUpdateAndWait(rgName, vnetName, this._subnetName, subnetProps);
        // workaround for https://github.com/Azure/azure-sdk-for-js/issues/20249
        context.subnet = await networkClient.subnets.get(rgName, vnetName, this._subnetName);
        ext.outputChannel.appendLog(this.getSuccessString());
    }

    public shouldExecute(context: IVirtualMachineWizardContext): boolean {
        return !context.subnet;
    }
    public getSuccessString(): string {
        return localize('createdVm', 'Created new subnet "{0}".', this._subnetName);
    }

    public getProgressString(): string {
        return localize('creatingVm', 'Creating new subnet "{0}"...', this._subnetName);
    }

    protected getFailString(): string {
        return this.getSuccessString();
    }
}
