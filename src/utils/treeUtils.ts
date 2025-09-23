/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { Uri } from 'vscode';
import { ext } from '../extensionVariables';

export namespace treeUtils {
    export interface IThemedIconPath {
        light: Uri;
        dark: Uri;
    }

    export function getIconPath(iconName: string): string {
        return path.join(getResourcesPath(), `${iconName}.svg`);
    }

    export function getThemedIconPath(iconName: string): IThemedIconPath {
        return {
            light: Uri.file(path.join(getResourcesPath(), 'light', `${iconName}.svg`)),
            dark: Uri.file(path.join(getResourcesPath(), 'dark', `${iconName}.svg`))
        };
    }

    function getResourcesPath(): string {
        return ext.context.asAbsolutePath('resources');
    }
}
