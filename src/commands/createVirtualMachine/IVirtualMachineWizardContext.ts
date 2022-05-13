/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ImageReference, OperatingSystemTypes, VirtualMachine, VirtualMachineSizeTypes } from '@azure/arm-compute';
import { NetworkInterface, NetworkSecurityGroup, PublicIPAddress, Subnet, VirtualNetwork } from '@azure/arm-network';
import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';
import { ExecuteActivityContext } from '@microsoft/vscode-azext-utils';

export interface IVirtualMachineWizardContext extends IResourceGroupWizardContext, ExecuteActivityContext {
    advancedCreation?: boolean;
    /**
     * The newly created Virtual Machine
     * This will be defined after `VirtualMachineCreateStep.execute` occurs.
     */
    virtualMachine?: VirtualMachine;

    /**
     * The name of the new VM.
     * This will be defined after `VirtualMachineNameStep.prompt` occurs.
     */
    newVirtualMachineName?: string;

    /**
     * The size of the VM.  The default value is `Standard_D2s_v3`.
     */
    size?: VirtualMachineSizeTypes;

    /**
     * The OS of the VM.  The default is `Linux`.
     */
    os?: OperatingSystemTypes;

    /**
     * The image task used to retrieve the image.  Because the task can take a while, we should retrieve it in parallel while users answer prompts.
     */
    imageTask?: Promise<ImageReference>;
    /**
     * The image used to create the VM.  The default is `Ubuntu Server 18.04 LTS`.
     */
    image?: ImageReference;

    /**
     * The network interface of the new VM.  This contains all the ipConfigurations such as public IP and subnet
     * This will be defined after `NetworkInterfaceCreateStep.execute`
     */
    networkInterface?: NetworkInterface;

    /**
     * The name to use for the new network interface.
     * It is set to newVirtualMachineName123 by default, where 123 are random 0-9 digits.
     */

    newNetworkInterfaceName?: string;

    /**
     * The network security group for the new VM.  It contains the security rules that control opening ports for SSH/HTTP/HTTPS.
     * This will be defined after `NetworkSecurityGroupCreateStep.execute`
     */
    networkSecurityGroup?: NetworkSecurityGroup;

    /**
     * The public IP address for the new VM. This is the public IP address that the user connects to.
     * This will be defined after `PublicIpCreateStep.execute`
     */
    publicIpAddress?: PublicIPAddress;

    /**
     * The subnet for the new VM.
     * This will be defined after `SubnetCreateStep.execute`
     */
    subnet?: Subnet;

    /**
     * The virtual network for the new VM.
     * This will be defined after `VirtualNetworkCreateStep.execute`
     */
    virtualNetwork?: VirtualNetwork;

    /**
     * The username to connect to the VM via SSH.  It defaults to `azureuser`
     */
    adminUsername?: string;

    /**
     * The addressPrefix that is used for subnets and virtual networks.  It defaults to `10.1.0.0/24`.
     */

    addressPrefix?: string;

    /**
     * Linux: Passphrase used to connect the VM via SSH.  Prompt can be disabled with `azureVirtualMachines.promptForPassphrase`.
     * Windows: **Required** Password used as the admin password.
     * This will be defined after PassphrasePromptStep.
     */
    passphrase?: string;

    /**
     * Name of the SSH key used for the new virtual machine
     */
    sshKeyName?: string;
}
