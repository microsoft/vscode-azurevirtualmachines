/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from "@azure/arm-compute";
import { nonNullProp } from "../../utils/nonNull";

export async function getAvailableVMLocations(computeClient: ComputeManagementClient, size?: ComputeManagementModels.VirtualMachineSizeTypes): Promise<string[]> {

    const resourceSkus: ComputeManagementModels.ResourceSkusResult = await computeClient.resourceSkus.list();
    return resourceSkus.
        filter(sku => sku.resourceType && sku.resourceType === 'virtualMachines')
        .filter(sku => sku.name && sku.name === size && sku.locations)
        .filter(sku => sku.restrictions?.length === 0 || sku.restrictions?.find(rescriction => rescriction.type !== 'Location'))
        .map(sku => nonNullProp(sku, 'locations'))
        .reduce((list, loc) => list.concat(loc));
}
