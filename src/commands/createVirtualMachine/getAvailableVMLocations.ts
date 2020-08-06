/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient, ComputeManagementModels } from "@azure/arm-compute";
import { createAzureClient } from "vscode-azureextensionui";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export async function getAvailableVMLocations(context: IVirtualMachineWizardContext): Promise<{ name?: string }[]> {
    const computeClient: ComputeManagementClient = createAzureClient(context, ComputeManagementClient);

    const resourceSkus: ComputeManagementModels.ResourceSkusResult = await computeClient.resourceSkus.list();
    return resourceSkus.
        filter(sku => sku.resourceType && sku.resourceType === 'virtualMachines')
        .filter(sku => sku.name && sku.name === context.size)
        .filter(sku => sku.restrictions?.length === 0 || sku.restrictions?.find(rescriction => rescriction.type !== 'Location'))
        .map(sku => {
            return { name: sku.locations && sku.locations[0] };
        });
}
