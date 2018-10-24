/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { ESPDebugSession } from "./esp";
import * as Net from 'net';

/*
 * Set the following compile time flag to true if the
 * debug adapter should run inside the extension host.
 * Please note: the test suite does no longer work in this mode.
 */

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('extension.esp32-debug.getProgramName', config =>
	{
		return vscode.window.showInputBox({
			placeHolder: "Please enter the name of a markdown file in the workspace folder",
			value: "readme.md"
		});
	}));

	// register a configuration provider for 'ESP' debug type
	const provider = new ESPDebugConfigurationProvider()
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('esp32-debug', provider));
	context.subscriptions.push(provider);
}

export function deactivate() {
	// nothing to do
}

class ESPDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration>
	{

		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name)
		{
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'markdown')
			{
				config.type = 'esp32-debug';
				config.name = 'Launch';
				config.request = 'launch';
				config.program = '${file}';
				config.stopOnEntry = true;
			}
		}

		if (!config.program)
		{
			return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ =>
			{
				return undefined;	// abort launch
			});
		}

		return config;
	}

	dispose() {}
}

