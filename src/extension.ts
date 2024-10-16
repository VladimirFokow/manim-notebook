// This file contains a function licensed under CC-BY-NC-SA 4.0.
// See the comment below for details, starting with "License:"


// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-manim" is now active!');




	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable1 = vscode.commands.registerCommand('vscode-manim.helloData', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// terminal.show();
		vscode.window.showInformationMessage('Hello Data from vscode-manim!');
	});




	// License:
	// - The idea behind this function is licensed under: CC-BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/
	// - author: 3Blue1Brown
	// - original source file: https://github.com/3b1b/videos/blob/4203c7a9a54842b98c943d7d8f5d85dea330c543/sublime_custom_commands/manim_plugins.py
	// - clarification of license: https://github.com/3b1b/videos/issues/79
	// - Extent of modifications that this file has done:
	//   This function was translated: from python & SublimeText APIs -> into TypeScript & VSCode APIs.
	//
	//
	// "manim_run_scene"
	// Runs the `manimgl` command, with data from the line where cursor starts.
	// - if cursor is on a class definition line, no `-se <line_number>`
	// - also copy the command to clipboard with ADDITIONAL args: `--prerun --finder -w`
	//
	// manimgl <file_name> <ClassName> [-se <line_number>] [--prerun --finder -w]
	const disposable2 = vscode.commands.registerCommand('vscode-manim.runScene', async () => {

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('Editor not found');
			return;
		}

		// Save the active file:
		vscode.commands.executeCommand('workbench.action.files.save');

		const file_path = editor.document.fileName;  // absolute path
		if (!file_path.endsWith('.py')) {
			vscode.window.showErrorMessage('Check failed: file must end with .py');
			return;
		}

		const contents = editor.document.getText();
		const all_lines = contents.split("\n");

		// Find which lines define classes
		const class_lines = all_lines  // E.g., class_lines = [{ line: "class FirstScene(Scene):", index: 3 }, ...]
			.map((line, index) => ({ line, index }))
			.filter(({ line }) => /^class (.+?)\((.+?)\):/.test(line));

		// Where is the cursor (row = line)
		const row = editor.selection.start.line;

		// Find the first class defined before where the cursor is
		const matching_class = class_lines  // E.g., matching_class = { line: "class SelectedScene(Scene):", index: 42 }
			.reverse()
			.find(({ index }) => index <= row);
		if (!matching_class) {
			vscode.window.showErrorMessage('No matching classes');
			return;
		}
		const scene_name = matching_class.line.slice("class ".length, matching_class.line.indexOf("("));  // E.g., scene_name = "SelectedScene"

		// Create the command
		const cmds = ["manimgl", file_path, scene_name];
		let enter = false;
		if (row !== matching_class.index) {
			cmds.push(`-se ${row + 1}`);
			enter = true;
		}
		const command = cmds.join(" ");

		// If one wants to run it in a different terminal,
        // it's often to write to a file
		await vscode.env.clipboard.writeText(command + " --prerun --finder -w");

		// Run the command
		const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
		terminal.sendText(command);

		// Focus some windows
		if (enter) {
			// Keep cursor where it started (in VSCode)
			const cmd_focus_vscode = 'osascript -e "tell application \\"Visual Studio Code\\" to activate"';
			// Execute the command in the shell after a delay (to give the animation window enough time to open)
			await new Promise(resolve => setTimeout(resolve, 2500));
			require('child_process').exec(cmd_focus_vscode);
		} else {
			terminal.show();
		}

		// // For debugging:
		// console.log('file_path:', file_path);
		// console.log('row:', row);
		// // console.log('contents:', contents);
		// // console.log('all_lines:', all_lines);
		// console.log('class_lines:', class_lines);
		// console.log('matching_class:', matching_class);
		// console.log('scene_name:', scene_name);
		// console.log('command:', command);
	});




	// "manim_checkpoint_paste"
	// Run checkpoint_paste() on the selection of the active editor
	let isExecuting = false;  // Flag: to prevent several commands executing at the same time (because clipboard saving would become uncontrollable in this case)
	const disposable3 = vscode.commands.registerCommand('vscode-manim.checkpointPaste', async () => {
		if (isExecuting) {
			vscode.window.showInformationMessage('Please wait until the current command finishes executing.');
			return;
		}

		isExecuting = true;
		try {
			// Editor must be found:
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('Editor not found');
				return;
			}
			let selectedText;
			if (editor.selection.isEmpty) {
				// If nothing is selected - select the whole line (for convenience):
				const line = editor.document.lineAt(editor.selection.start.line);
				selectedText = editor.document.getText(line.range);
			} else {
				// If selected - extend selection to start and end of lines (for convenience):
				const range = new vscode.Range(
					editor.selection.start.with(undefined, 0),
					editor.selection.end.with(undefined, Number.MAX_SAFE_INTEGER)
				);
				selectedText = editor.document.getText(range);
			}
			// Selected text must not be empty:
			if (!selectedText) {
				vscode.window.showErrorMessage('No text selected in the editor');
				return;
			}

			// Save current clipboard content
			const clipboardBuffer = await vscode.env.clipboard.readText();

			// Copy the selected text to the clipboard
			await vscode.env.clipboard.writeText(selectedText);

			// Create or show the terminal
			const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();

			// Send the checkpoint_paste() command
			terminal.sendText(
				'\x0C' +  // to center the terminal (Command + l)
				'checkpoint_paste()'
			);

			// Restore original clipboard content
			await new Promise(resolve => setTimeout(resolve, 500));  // must wait a bit (so that checkpoint_paste() above doesn't capture the next clipboard)
			await vscode.env.clipboard.writeText(clipboardBuffer);

		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error}`);
		} finally {
			isExecuting = false;
		}
	});




	context.subscriptions.push(disposable1, disposable2, disposable3);
}

// This method is called when your extension is deactivated
export function deactivate() {}
