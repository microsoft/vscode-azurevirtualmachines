/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

let locationCount: number = getStartingIndex();
const locations = ["West US 2", "West Europe", "East US", "Southeast Asia"];
export function getRotatingLocation(): string {
    locationCount += 1;
    return locations[locationCount % locations.length];
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
