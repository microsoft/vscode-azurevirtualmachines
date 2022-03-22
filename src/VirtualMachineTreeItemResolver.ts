/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, VirtualMachine } from "@azure/arm-compute";
import { callWithTelemetryAndErrorHandling, IActionContext, ISubscriptionContext, nonNullProp } from "@microsoft/vscode-azext-utils";
import { AppResource, AppResourceResolver } from "./api";
import { ResolvedVirtualMachine, VirtualMachineTreeItem } from './tree/VirtualMachineTreeItem';
import { createComputeClient } from "./utils/azureClients";
import { getResourceGroupFromId } from "./utils/azureUtils";

export class VirtualMachineResolver implements AppResourceResolver {

    // possibly pass down the full tree item, but for now try to get away with just the AppResource
    public async resolveResource(subContext: ISubscriptionContext, resource: AppResource): Promise<ResolvedVirtualMachine | null> {
        return await callWithTelemetryAndErrorHandling('resolveResource', async (context: IActionContext) => {
            try {
                const client: ComputeManagementClient = await createComputeClient([context, subContext]);
                const vm: VirtualMachine = await client.virtualMachines.get(getResourceGroupFromId(nonNullProp(resource, 'id')), nonNullProp(resource, 'name'))
                const instanceView = await client.virtualMachines.instanceView(getResourceGroupFromId(nonNullProp(vm, 'id')), nonNullProp(vm, 'name'));

                return new VirtualMachineTreeItem(subContext, { ...resource, ...vm }, instanceView);
            } catch (e) {
                console.error({ ...context, ...subContext });
                throw e;
            }
        }) ?? null;
    }

    public matchesResource(resource: AppResource): boolean {
        return resource.type.toLowerCase() === 'microsoft.compute/virtualmachines';
    }
}
