// Copied from https://github.com/microsoft/vscode-remote-ssh/blob/186fbac18b4859ab70f2c7332b5f608a49e45dc7/open-ssh-remote/src/typings/ssh-config.d.ts
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

declare module 'ssh-config' {

    export type LeafConfigurationEntry = ConfigurationDirective | ConfigurationComment;
    export type ConfigurationEntry = HostConfigurationDirective | LeafConfigurationEntry;

    export const enum Type {
        Directive = 1,
        Comment = 2
    }

    export interface Configuration extends Array<ConfigurationEntry> {
        compute(host: string): ResolvedConfiguration;

        /**
         * Appends a map of parameters to values. If "Host" is included
         * as one of the keys, all subsequent keys will be nested under
         * that host entry.
         */
        append(options: { [key: string]: string }): void;

        /**
         * Prints the properly formatted configuration.
         */
        toString(): string;
    }

    /**
     * Should match CASE_NORMALIZED_PROPS to be normalized to this casing
     */
    export interface ResolvedConfiguration {
        Host: string;
        HostName: string;
        IdentityFile: string[];
        User: string;
        Port: string;
        ConnectTimeout?: string;
        RemoteCommand?: string;
        LocalForward?: string[];
    }

    export interface BaseConfigurationDirective {
        type: Type.Directive;
        param: string;
        value: string | string[];
    }

    export interface ConfigurationDirective extends BaseConfigurationDirective {
        value: string;
    }

    export interface HostConfigurationDirective extends BaseConfigurationDirective {
        param: 'Host';
        config: LeafConfigurationEntry[];
    }

    export interface ConfigurationComment {
        type: Type.Comment;
        content: string;
    }

    export function parse(raw: string): Configuration;

    export function stringify(directive: ReadonlyArray<HostConfigurationDirective>): string;
}
