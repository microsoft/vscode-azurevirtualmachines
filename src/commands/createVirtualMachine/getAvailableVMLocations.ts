/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import ComputeManagementClient, { ComputeManagementModels } from "azure-arm-compute";
import { createAzureClient } from "vscode-azureextensionui";
import { IVirtualMachineWizardContext } from "./IVirtualMachineWizardContext";

export async function getAvailableVMLocations(context: IVirtualMachineWizardContext): Promise<{ name?: string }[]> {
    const computeClient: ComputeManagementClient = createAzureClient(context, ComputeManagementClient);

    const resourceSkus: ComputeManagementModels.ResourceSkusResult = await computeClient.resourceSkus.list();
    return resourceSkus.
        filter(sku => sku.resourceType && sku.resourceType === 'virtualMachines')
        // tslint:disable-next-line: strict-boolean-expressions
        .filter(vm => vm.name && vm.name === context.size || 'Standard_D2s_v3')
        .filter(vmBySize => vmBySize.restrictions?.length === 0 || vmBySize.restrictions?.find(res => res.type !== 'Location'))
        .map(validVm => {
            return { name: validVm.locations && validVm.locations[0] };
        });
}
