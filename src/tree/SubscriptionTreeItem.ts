/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SubscriptionTreeItemBase } from '@microsoft/vscode-azext-azureutils';
import { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../localize';

export class SubscriptionTreeItem extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = localize('VirtualMachine', 'Virtual Machine');
    public supportsAdvancedCreation: boolean = true;

    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        return [];
    }
}
