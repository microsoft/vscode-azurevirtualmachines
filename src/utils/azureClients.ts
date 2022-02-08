/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementClient } from '@azure/arm-compute';
import { NetworkManagementClient } from '@azure/arm-network';
import { ResourceManagementClient } from '@azure/arm-resources';
import { AzExtClientContext, createAzureClient, parseClientContext } from '@microsoft/vscode-azext-azureutils';

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
