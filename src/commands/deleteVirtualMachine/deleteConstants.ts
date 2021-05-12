/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { localize } from "../../localize";

export type ResourceToDelete = {
    resourceName: string;
    resourceType: string;
    picked?: boolean; // mark true if the resource should be marked to delete by default
    deleteMethod(): Promise<void>; // an async wrapper for the deleteMethod to be called
};

export interface IDeleteChildImplContext extends IActionContext {

    /**
     * Resources to be deleted
     */
    resourcesToDelete: ResourceToDelete[];

    /**
     * String of resources that are being deleted used for output
     */
    resourceList: string;

    /**
     * Flag to determine if the virtual machine is in the resourcesToDelete
     */
    deleteVm?: boolean;
}

export const networkInterfaceLabel: string = localize('networkInterface', 'network interface');
export const virtualMachineLabel: string = localize('virtualMachine', 'virtual machine');
export const virtualNetworkLabel: string = localize('virtualNetwork', 'virtual network');
