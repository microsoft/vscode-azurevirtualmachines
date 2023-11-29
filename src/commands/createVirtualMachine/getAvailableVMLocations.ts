/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { type ComputeManagementClient, type ResourceSku } from "@azure/arm-compute";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { nonNullProp } from "@microsoft/vscode-azext-utils";
import { createComputeClient } from "../../utils/azureClients";
import { type IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export async function getAvailableVMLocations(context: IVirtualMachineWizardContext): Promise<string[]> {
    const computeClient: ComputeManagementClient = await createComputeClient(context);

    const resourceSkus: ResourceSku[] = await uiUtils.listAllIterator(computeClient.resourceSkus.list());
    return resourceSkus.
        filter(sku => sku.resourceType && sku.resourceType === 'virtualMachines')
        .filter(sku => sku.name && sku.name === context.size && sku.locations)
        .filter(sku => sku.restrictions?.length === 0 || sku.restrictions?.find(restriction => restriction.type !== 'Location'))
        .map(sku => nonNullProp(sku, 'locations'))
        .reduce((list, loc) => list.concat(loc));
}
