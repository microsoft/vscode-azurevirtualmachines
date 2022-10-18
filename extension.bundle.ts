/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This is the external face of extension.bundle.js, the main webpack bundle for the extension.
 * Anything needing to be exposed outside of the extension sources must be exported from here, because
 * everything else will be in private modules in extension.bundle.js.
 */

// Export activate/deactivate for main.js
export { createAzureClient } from '@microsoft/vscode-azext-azureutils';
export * from '@microsoft/vscode-azext-utils';
export { createVirtualMachine, createVirtualMachineAdvanced } from './src/commands/createVirtualMachine/createVirtualMachine';
export { FeaturedImage, ImageListStep } from './src/commands/createVirtualMachine/ImageListStep';
export { activateInternal, deactivateInternal } from './src/extension';
// Exports for tests
// The tests are not packaged with the webpack bundle and therefore only have access to code exported from this file.
//
// The tests should import '../extension.bundle'. At design-time they live in tests/ and so will pick up this file (extension.bundle.ts).
// At runtime the tests live in dist/tests and will therefore pick up the main webpack bundle at dist/extension.bundle.js.
export * from './src/extensionVariables';
export { VirtualMachineTreeItem } from "./src/tree/VirtualMachineTreeItem";
export { createComputeClient, createResourceClient } from './src/utils/azureClients';
export * from './src/utils/cpUtils';
export * from './src/utils/delay';
export { getRandomHexString } from './src/utils/randomUtils';
export * from './src/vsCodeConfig/extensions';

