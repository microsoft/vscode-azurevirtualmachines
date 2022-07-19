/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { parseAzureResourceId } from "@microsoft/vscode-azext-azureutils";

export function getNameFromId(id: string): string {
    return parseAzureResourceId(id).resourceName;
}
