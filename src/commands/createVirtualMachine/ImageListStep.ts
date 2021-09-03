/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ComputeManagementModels } from "@azure/arm-compute";
import { AzExtRequestPrepareOptions, AzureWizardPromptStep, IActionContext, IAzureQuickPickItem, sendRequestWithTimeout } from "vscode-azureextensionui";
import { extraImagesMap } from "../../constants";
import { localize } from '../../localize';
import { IVirtualMachineWizardContext } from './IVirtualMachineWizardContext';

const apiVersion = '2018-08-01-beta';

export class ImageListStep extends AzureWizardPromptStep<IVirtualMachineWizardContext> {
    public async prompt(context: IVirtualMachineWizardContext): Promise<void> {
        const placeHolder: string = localize('selectImage', 'Select an image');
        const featuredImages: IAzureQuickPickItem<FeaturedImage | undefined>[] = (await this.getFeaturedImages(context)).map((fi) => { return { label: fi.displayName, data: fi }; });
        const picks = featuredImages.concat(this.getExtraImageQuickPicks(context.os));

        const image = (await context.ui.showQuickPick(picks, { placeHolder }));
        context.telemetry.properties.image = image.label;

        // if there was no data, it is not a featured image and we have a constant map for these
        if (image.data === undefined) {
            context.image = extraImagesMap[image.label];
        } else {
            const plan = await this.getPlanFromLegacyPlanId(context, image.data);
            context.imageTask = this.getImageReference(context, plan);
        }
    }

    public shouldPrompt(context: IVirtualMachineWizardContext): boolean {
        return !context.image && !context.imageTask;
    }

    public async getDefaultImageReference(context: IVirtualMachineWizardContext): Promise<ComputeManagementModels.ImageReference> {
        const images = await this.getFeaturedImages(context, context.os);
        // if we can't find Ubuntu Server 18.04 LTS for some reason, just default to the first image
        const defaultImage = images.find(i => /UbuntuServer1804LTS18_04/.test(i.legacyPlanId)) || images[0];

        const plan = await this.getPlanFromLegacyPlanId(context, defaultImage);
        return await this.getImageReference(context, plan);
    }

    public async getFeaturedImages(context: IActionContext, os?: ComputeManagementModels.OperatingSystemType): Promise<FeaturedImage[]> {
        // default to Linux if os is not available
        os ||= 'Linux';

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

    private async getImageReference(context: IActionContext, plan: PlanFromLegacyPlanId): Promise<ComputeManagementModels.ImageReference> {
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

    private getExtraImageQuickPicks(os?: ComputeManagementModels.OperatingSystemType): IAzureQuickPickItem[] {
        if (os === 'Windows') {
            return [];
        } else {
            // defaults to Linux
            return [
                {
                    label: 'Data Science Virtual Machine - Ubuntu 18.04 - Gen1',
                    data: undefined
                }
            ];
        }
    }
}


type FeaturedImage = {
    displayName: string,
    freeTierEligible: boolean,
    id: string,
    legacyPlanId: string,
    operatingSystem: { family: ComputeManagementModels.OperatingSystemTypes }
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
        osPlatform: ComputeManagementModels.OperatingSystemTypes,
        recommendedSizes: ComputeManagementModels.VirtualMachineSizeTypes[],
        imageReference: ComputeManagementModels.ImageReference

    }
};
