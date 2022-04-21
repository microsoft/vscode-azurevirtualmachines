/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ExecuteActivityContext } from "@microsoft/vscode-azext-utils";
import { ResolvedVirtualMachineTreeItem } from "../../tree/VirtualMachineTreeItem";
import { IDeleteChildImplContext } from "./deleteConstants";

export interface DeleteVirtualMachineWizardContext extends IDeleteChildImplContext, ExecuteActivityContext {
    node?: ResolvedVirtualMachineTreeItem;
}
