/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type ComputeManagementClient } from '@azure/arm-compute';
import { type NetworkManagementClient } from '@azure/arm-network';
import { type ResourceManagementClient } from '@azure/arm-resources';
import { createAzureClient, parseClientContext, type AzExtClientContext } from '@microsoft/vscode-azext-azureutils';

// Lazy-load @azure packages to improve startup performance.
// NOTE: The client is the only import that matters, the rest of the types disappear when compiled to JavaScript

export async function createComputeClient(context: AzExtClientContext): Promise<ComputeManagementClient> {
    return createAzureClient(context, (await import('@azure/arm-compute')).ComputeManagementClient);
}

export async function createNetworkClient(context: AzExtClientContext): Promise<NetworkManagementClient> {
    if (parseClientContext(context).isCustomCloud) {
        return <NetworkManagementClient><unknown>createAzureClient(context, (await import('@azure/arm-network-profile-2020-09-01-hybrid')).NetworkManagementClient);
    } else {
        return createAzureClient(context, (await import('@azure/arm-network')).NetworkManagementClient);
    }
}

export async function createResourceClient(context: AzExtClientContext): Promise<ResourceManagementClient> {
    if (parseClientContext(context).isCustomCloud) {
        return <ResourceManagementClient><unknown>createAzureClient(context, (await import('@azure/arm-resources-profile-2020-09-01-hybrid')).ResourceManagementClient);
    } else {
        return createAzureClient(context, (await import('@azure/arm-resources')).ResourceManagementClient);
    }
}
