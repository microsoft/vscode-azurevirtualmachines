import { ComputeManagementModels } from "@azure/arm-compute";
import { ISubscriptionContext } from "vscode-azureextensionui";

export function getVirtualMachineSize(subscription: ISubscriptionContext): ComputeManagementModels.VirtualMachineSizeTypes {
    return subscription.isCustomCloud ? 'Standard_DS1_v2' : 'Standard_D2s_v3'
}
