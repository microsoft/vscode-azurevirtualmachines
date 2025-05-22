/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type ImageReference, type OperatingSystemType, type OperatingSystemTypes, type VirtualMachineSizeTypes } from "@azure/arm-compute";
import { sendRequestWithTimeout, type AzExtRequestPrepareOptions } from "@microsoft/vscode-azext-azureutils";
import { AzureWizardPromptStep, type IActionContext, type IAzureQuickPickItem } from "@microsoft/vscode-azext-utils";
import { localize } from '../../localize';
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

    public async getDefaultImageReference(context: IActionContext): Promise<ImageReference> {
        const images = await this.getFeaturedImages(context);
        // if we can't find Ubuntu Server 24.04 LTS for some reason, just default to the first image
        const defaultImage = images.find(i => /ubuntu-24_04-ltsserver/.test(i.legacyPlanId)) || images[0];

        const plan = await this.getPlanFromLegacyPlanId(context, defaultImage);
        return await this.getImageReference(context, plan);
    }

    public async getQuickPicks(context: IActionContext, os?: OperatingSystemType):
        Promise<IAzureQuickPickItem<FeaturedImage | ImageReference>[]> {
        return (await this.getFeaturedImages(context, os)).map((fi) => { return { label: fi.displayName, data: fi }; });
    }

    private async getFeaturedImages(context: IActionContext, os: OperatingSystemType = 'Linux'): Promise<FeaturedImage[]> {
        /*
        ** the url the portal uses to get the featured images is the following so model request off that
        ** https://catalogapi.azure.com/catalog/curationgrouplisting?api-version=2018-08-01-beta&
        ** group=Marketplace.FeaturedItems&returnedProperties=operatingSystem.family,id,image,freeTierEligible,legacyPlanId
        */

        const options: AzExtRequestPrepareOptions = {
            method: 'GET',
            url: createRequestUrl('https://catalogapi.azure.com/catalog/curationgrouplisting', {
                ...apiVersionQueryParam,
                "group": 'Marketplace.FeaturedItems',
                "returnedProperties": 'operatingSystem.family,id,image,freeTierEligible,legacyPlanId',
            }),
        };

        const images = <FeaturedImage[]>(await sendRequestWithTimeout(context, options, 5 * 1000, undefined)).parsedBody;
        return images.filter(i => i.operatingSystem.family === os);
    }

    private async getPlanFromLegacyPlanId(context: IActionContext, featuredImage: FeaturedImage): Promise<PlanFromLegacyPlanId> {
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

    private async getImageReference(context: IActionContext, plan: PlanFromLegacyPlanId): Promise<ImageReference> {
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
}

export type FeaturedImage = {
    displayName: string,
    freeTierEligible?: boolean,
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
