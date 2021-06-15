/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from "@azure/arm-compute";
import { createComputeClient } from "../../utils/azureClients";
import { nonNullProp } from "../../utils/nonNull";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export async function getAvailableVMLocations(context: IVirtualMachineWizardContext): Promise<string[]> {
    const computeClient: ComputeManagementClient = await createComputeClient(context);

    const resourceSkus: ComputeManagementModels.ResourceSkusResult = await computeClient.resourceSkus.list();
    return resourceSkus.
        filter(sku => sku.resourceType && sku.resourceType === 'virtualMachines')
        .filter(sku => sku.name && sku.name === context.size)
        .filter(sku => sku.restrictions?.length === 0 || sku.restrictions?.find(rescriction => rescriction.type !== 'Location'))
        .map(sku => {
            return nonNullProp(sku, 'name');
        });
}
