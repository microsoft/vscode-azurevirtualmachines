/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

let locationCount: number = getStartingIndex();
const locations: string[] = ["East US", "East US 2", "West US 2", "West US 3", "Australia East", "Southeast Asia", "North Europe", "UK South", "West Europe", "Central US", "South Africa North", "Central India", "Japan East", "France Central", "Germany West Central"];
export function getRotatingLocation(): string {
    locationCount += 1;
    return locations[locationCount % locations.length];
}

let pricingTierCount: number = getStartingIndex();
const pricingTiers: (string | RegExp)[] = [/P1v2/, 'P2v2', 'P3v2', /B1/, 'B2', 'B3', 'S1', 'S2', 'S3'];
export function getRotatingPricingTier(): string | RegExp {
    pricingTierCount += 1;
    return pricingTiers[pricingTierCount % pricingTiers.length];
}

/**
 * Adds a little more spice to the rotation
 */
function getStartingIndex(): number {
    if (process.platform === 'darwin') {
        return 0;
    } else if (process.platform === 'win32') {
        return 1;
    } else {
        return 2;
    }
}
