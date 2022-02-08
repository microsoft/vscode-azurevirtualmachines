/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ImageReference, OperatingSystemType, OperatingSystemTypes, VirtualMachineSizeTypes } from "@azure/arm-compute";
import { AzExtRequestPrepareOptions, AzureWizardPromptStep, IActionContext, IAzureQuickPickItem, sendRequestWithTimeout } from "vscode-azureextensionui";
import { localize } from '../../localize';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

export const apiVersion = '2018-08-01-beta';

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

    public async getDefaultImageReference(context: IActionContext): Promise<ImageReference> {
        const images = await this.getFeaturedImages(context);
        // if we can't find Ubuntu Server 18.04 LTS for some reason, just default to the first image
        const defaultImage = images.find(i => /UbuntuServer1804LTS18_04/.test(i.legacyPlanId)) || images[0];

        const plan = await this.getPlanFromLegacyPlanId(context, defaultImage);
        return await this.getImageReference(context, plan);
    }

    public async getQuickPicks(context: IActionContext, os?: OperatingSystemType):
        Promise<IAzureQuickPickItem<FeaturedImage | ImageReference>[]> {
        const featuredImages: IAzureQuickPickItem<FeaturedImage | ImageReference>[] = (await this.getFeaturedImages(context, os)).map((fi) => { return { label: fi.displayName, data: fi }; });
        return featuredImages.concat(this.getExtraImageQuickPicks(os));
    }

    private async getFeaturedImages(context: IActionContext, os: OperatingSystemType = 'Linux'): Promise<FeaturedImage[]> {
        /*
        ** the url the portal uses to get the featured images is the following so model request off that
        ** https://catalogapi.azure.com/catalog/curationgrouplisting?api-version=2018-08-01-beta&
        ** group=Marketplace.FeaturedItems&returnedProperties=operatingSystem.family,id,image,freeTierEligible,legacyPlanId
        */

        const options: AzExtRequestPrepareOptions = {
            method: 'GET',
            url: 'https://catalogapi.azure.com/catalog/curationgrouplisting',
            queryParameters: {
                "api-version": { value: apiVersion },
                "group": { value: 'Marketplace.FeaturedItems' },
                "returnedProperties": { value: 'operatingSystem.family,id,image,freeTierEligible,legacyPlanId' }
            }
        };

        const images = <FeaturedImage[]>(await sendRequestWithTimeout(context, options, 5 * 1000, undefined)).parsedBody;
        return images.filter(i => i.operatingSystem.family === os);
    }

    private async getPlanFromLegacyPlanId(context: IActionContext, featuredImage: FeaturedImage): Promise<PlanFromLegacyPlanId> {
        const getOfferOptions: AzExtRequestPrepareOptions = {
            method: 'GET',
            url: `https://euap.catalogapi.azure.com/view/offers/${featuredImage.legacyPlanId}`,
            queryParameters: {
                "api-version": { value: apiVersion }
            }
        };

        const offer = <OfferFromLegacyPlanId>(await sendRequestWithTimeout(context, getOfferOptions, 5 * 1000, undefined)).parsedBody;
        const plan: PlanFromLegacyPlanId | undefined = offer.plans.find(plan => featuredImage.id === plan.id);

        if (!plan) {
            throw new Error(localize('noPlan', 'Could not find plan from featured offer.'))
        }

        return plan;
    }

    private async getImageReference(context: IActionContext, plan: PlanFromLegacyPlanId): Promise<ImageReference> {
        const uiDefUri: string | undefined = plan.artifacts.find(art => art.name === 'createuidefinition')?.uri
        if (!uiDefUri) {
            throw new Error(localize('noUiDefUri', 'Could not find image reference from featured offer.'))
        }

        const getUiDefOptions: AzExtRequestPrepareOptions = {
            method: 'GET',
            url: uiDefUri,
            queryParameters: {
                "api-version": { value: apiVersion }
            }
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
