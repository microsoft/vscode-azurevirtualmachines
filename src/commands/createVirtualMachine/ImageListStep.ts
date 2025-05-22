/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type ImageReference, type OperatingSystemType, type OperatingSystemTypes, type VirtualMachineSizeTypes } from "@azure/arm-compute";
import { createHttpHeaders, createPipelineRequest } from "@azure/core-rest-pipeline";
import { createGenericClient, sendRequestWithTimeout, uiUtils, type AzExtPipelineResponse, type AzExtRequestPrepareOptions } from "@microsoft/vscode-azext-azureutils";
import { AzureWizardPromptStep, type IAzureQuickPickItem, type ISubscriptionActionContext } from "@microsoft/vscode-azext-utils";
import { localize } from '../../localize';
import { createComputeClient } from "../../utils/azureClients";
import { createRequestUrl } from "../../utils/requestUtils";
import { type IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export const apiVersion = '2018-08-01-beta';
const apiVersionQueryParam = {
    'api-version': apiVersion,
}

export class ImageListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const placeHolder: string = localize('selectImage', 'Select an image');
        const picks = await this.getQuickPicks(context, context.os);

        const image = (await context.ui.showQuickPick(picks, { placeHolder }));
        context.telemetry.properties.image = image.label;

        // if there was no data, it is not a featured image and we have a constant map for these
        if ('legacyPlanId' in image.data) {
            const plan = await this.getPlanFromLegacyPlanId(context, image.data);
            context.imageTask = this.getImageReference(context, plan);
        } else {
            context.image = image.data;
        }
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return !context.image && !context.imageTask;
    }

    public async getDefaultImageReference(context: ISubscriptionActionContext): Promise<ImageReference> {
        const images = await this.getFeaturedImages(context);
        // if we can't find Ubuntu Server 18.04 LTS for some reason, just default to the first image
        const defaultImage = images.find(i => /UbuntuServer1804LTS18_04/.test(i.legacyPlanId)) || images[0];

        const plan = await this.getPlanFromLegacyPlanId(context, defaultImage);
        return await this.getImageReference(context, plan);
    }

    public async getQuickPicks(context: ISubscriptionActionContext, os?: OperatingSystemType):
        Promise<IAzureQuickPickItem<FeaturedImage | ImageReference>[]> {
        const featuredImages: IAzureQuickPickItem<FeaturedImage | ImageReference>[] = (await this.getFeaturedImages(context, os)).map((fi) => { return { label: fi.displayName, data: fi }; });
        return featuredImages.concat(this.getExtraImageQuickPicks(os));
    }

    private async getFeaturedImages(context: ISubscriptionActionContext, _os: OperatingSystemType = 'Linux'): Promise<FeaturedImage[]> {
        const apiVersion: string = '2023-05-01-preview';
        const uniqueProductIds: string[] = ["'canonical.ubuntu-24_04-lts'", "'canonical.0001-com-ubuntu-server-jammy'", "'suse.sles-15-sp5-basic'", "'redhat.rhel-20190605'", "'oracle.oracle-linux'", "'debian.debian-12'", "'microsoftwindowsserver.windowsserver'", "'microsoftwindowsdesktop.windows-11'", "'almalinux.almalinux-x86_64'"];
        // const imageProps: string = ['uniqueProductId', 'publisherId', 'displayName', 'operatingsystems'];
        const imageProps: string[] = [];
        // const planProps: string[] = ['vmSecurityTypes', 'uniquePlanId', 'vmArchitectureType', 'displayName'];
        const planProps: string[] = [];

        const authToken = (await context.credentials.getToken() as { token?: string }).token;
        const options: AzExtRequestPrepareOptions = {
            url: `https://catalogapi.azure.com/products?api-version=${apiVersion}&storefront=azure&language=en&$filter=uniqueProductId in (${uniqueProductIds.join(',')})&$select=${imageProps.join(',')}&$expand=plans($select=${planProps.join(',')})`,
            method: 'GET',
            headers: createHttpHeaders({
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': '', // public api key
            }),
        };

        const client = await createGenericClient(context, undefined);
        // We don't care about storing the response here because the manual response returned is different from the SDK formatting that our code expects.
        // The stored site should come from the SDK instead.
        const response = await client.sendRequest(createPipelineRequest(options)) as AzExtPipelineResponse;

        const topImageIdsPublic = [
            'canonical.ubuntu-24_04-ltsserver',
            'canonical.0001-com-ubuntu-server-jammy22_04-lts-gen2',
            'canonical.ubuntu-24_04-ltsubuntu-pro',
            'suse.sles-15-sp5-basicgen2',
            'oracle.oracle-linuxol810-lvm-gen2',
            'redhat.rhel-2019060594_gen2',
            'redhat.rhel-20190605810-gen2',
            'almalinux.almalinux-x86_649-gen2',
            'debian.debian-1212-gen2',
            'microsoftwindowsserver.windowsserver2025-datacenter-azure-edition',
            'microsoftwindowsserver.windowsserver2022-datacenter-azure-edition-hotpatch',
            'microsoftwindowsserver.windowsserver2022-datacenter-azure-edition',
            'Microsoft.WindowsServer2019Datacenter2019-datacenter-gensecond',
            'microsoftwindowsdesktop.windows-11win11-24h2-pro',
        ];

        // Todo: Add additional for mooncake and fairfax (however, may need API keys)

        const images: FeaturedImageV2[] = (response.parsedBody as { items?: FeaturedImageV2[] })?.items ?? [];
        console.log(images);

        const sdkClient = await createComputeClient(context);
        const image = await uiUtils.listAllIterator(sdkClient.communityGalleryImages.list('westus', 'Azure'))
        console.log(image)

        // Filter only the images that match the os, then return
        return images as FeaturedImage[];
    }

    private async getPlanFromLegacyPlanId(context: ISubscriptionActionContext, featuredImage: FeaturedImage): Promise<PlanFromLegacyPlanId> {
        const getOfferOptions: AzExtRequestPrepareOptions = {
            method: 'GET',
            url: createRequestUrl(`https://euap.catalogapi.azure.com/view/offers/${featuredImage.legacyPlanId}`, apiVersionQueryParam),
        };

        const offer = <OfferFromLegacyPlanId>(await sendRequestWithTimeout(context, getOfferOptions, 5 * 1000, undefined)).parsedBody;
        const plan: PlanFromLegacyPlanId | undefined = offer.plans.find(plan => featuredImage.id === plan.id);

        if (!plan) {
            throw new Error(localize('noPlan', 'Could not find plan from featured offer.'))
        }

        return plan;
    }

    private async getImageReference(context: ISubscriptionActionContext, plan: PlanFromLegacyPlanId): Promise<ImageReference> {
        const uiDefUri: string | undefined = plan.artifacts.find(art => art.name === 'createuidefinition')?.uri
        if (!uiDefUri) {
            throw new Error(localize('noUiDefUri', 'Could not find image reference from featured offer.'))
        }
        const getUiDefOptions: AzExtRequestPrepareOptions = {
            method: 'GET',
            url: createRequestUrl(uiDefUri, apiVersionQueryParam),
        };

        const createdUiDefintion = <UiDefinition>(await sendRequestWithTimeout(context, getUiDefOptions, 5 * 1000, undefined)).parsedBody;
        return createdUiDefintion.parameters.imageReference;
    }

    private getExtraImageQuickPicks(os?: OperatingSystemType): IAzureQuickPickItem<ImageReference>[] {
        if (os === 'Windows') {
            return [];
        } else {
            // defaults to Linux
            return [
                {
                    label: 'Data Science Virtual Machine - Ubuntu 18.04 - Gen1',
                    data: {
                        publisher: 'microsoft-dsvm',
                        offer: 'ubuntu-1804',
                        sku: '1804',
                        version: 'latest'
                    }
                }
            ];
        }
    }
}

export type FeaturedImage = {
    displayName: string,
    freeTierEligible: boolean,
    id: string,
    legacyPlanId: string,
    operatingSystem: { family: OperatingSystemTypes }
};

export type FeaturedImageV2 = {
    displayName?: string;
    publisherId?: string;
    plans?: {
        displayName?: string;
        vmArchitectureType?: 'X64Gen2' | string;
    }[]
}

/*
** The following response types have many more properties, but these are the ones we care about.
*/
type OfferFromLegacyPlanId = {
    plans: PlanFromLegacyPlanId[]
};

type PlanFromLegacyPlanId = {
    id: string,
    artifacts: PlanArtifacts[]
};

type PlanArtifacts = {
    name: string,
    type: string,
    uri: string
};

type UiDefinition = {
    parameters: {
        osPlatform: OperatingSystemTypes,
        recommendedSizes: VirtualMachineSizeTypes[],
        imageReference: ImageReference
    }
};
