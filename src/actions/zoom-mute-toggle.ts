import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { execSync } from "child_process";
import { ZoomMonitor } from "./zoom-monitor";

/**
 * Action to toggle Zoom mute/unmute using AppleScript with improved reliability
 */
@action({ UUID: "com.thiagoandf.zoomer.mute-toggle" })
export class ZoomMuteToggle extends SingletonAction<ZoomMuteSettings> {
	private stateCheckInterval?: NodeJS.Timeout;

	/**
	 * Set the initial state when the action appears
	 */
	override async onWillAppear(ev: WillAppearEvent<ZoomMuteSettings>): Promise<void> {
		await this.updateState(ev.action);
		this.startPeriodicStateCheck(ev.action);
	}

	/**
	 * Clean up when action disappears
	 */
	override async onWillDisappear(): Promise<void> {
		if (this.stateCheckInterval) {
			clearInterval(this.stateCheckInterval);
		}
	}

	/**
	 * Handle key press to toggle mute state
	 */
	override async onKeyDown(ev: KeyDownEvent<ZoomMuteSettings>): Promise<void> {
		try {
			// Check if Zoom is running first
			const isZoomRunning = this.isZoomRunning();
			if (!isZoomRunning) {
				await ev.action.setTitle("Zoom\nNot Running");
				return;
			}

			const { settings } = ev.payload;
			const controlMethod = settings.controlMethod || "keyboard";
			const keyboardShortcut = settings.keyboardShortcut || "cmd+shift+option+a";

			let appleScript: string;

			if (controlMethod === "menubar") {
				// Use menu bar approach
				appleScript = `
					tell application "System Events"
						tell process "zoom.us"
							try
								click menu item "Mute audio" of menu 1 of menu bar item "Meeting" of menu bar 1
							on error
								try
									click menu item "Unmute audio" of menu 1 of menu bar item "Meeting" of menu bar 1
								on error
									${this.generateKeystrokeScript(keyboardShortcut)}
								end try
							end try
						end tell
					end tell
				`;
			} else {
				// Use keyboard shortcut approach (default)
				appleScript = `
					tell application "zoom.us"
						activate
					end tell
					delay 0.1
					tell application "System Events"
						${this.generateKeystrokeScript(keyboardShortcut)}
					end tell
				`;
			}

			execSync(`osascript -e '${appleScript}'`);


			// Verify actual state after a reasonable delay
			setTimeout(async () => {
				await this.updateState(ev.action);
			}, 500);

		} catch (error) {
			console.error("Failed to toggle Zoom mute:", error);
			await ev.action.setTitle("Error");
		}
	}

	/**
	 * Generate AppleScript keystroke command from shortcut string
	 * @param shortcut - String like "cmd+shift+a" or "cmd+shift+option+a"
	 */
	private generateKeystrokeScript(shortcut: string): string {
		const parts = shortcut.toLowerCase().split('+');
		const key = parts[parts.length - 1]; // Last part is the key
		const modifiers = parts.slice(0, -1); // Everything else is modifiers

		const modifierMap: { [key: string]: string } = {
			'cmd': 'command down',
			'command': 'command down',
			'shift': 'shift down',
			'opt': 'option down',
			'option': 'option down',
			'alt': 'option down',
			'ctrl': 'control down',
			'control': 'control down'
		};

		const appleScriptModifiers = modifiers
			.map(mod => modifierMap[mod])
			.filter(mod => mod) // Remove undefined modifiers
			.join(', ');

		if (appleScriptModifiers) {
			return `keystroke "${key}" using {${appleScriptModifiers}}`;
		} else {
			return `keystroke "${key}"`;
		}
	}

	/**
	 * Check if Zoom is running
	 */
	private isZoomRunning(): boolean {
		try {
			const result = execSync(`pgrep -f "zoom.us"`).toString().trim();
			return result.length > 0;
		} catch {
			return false;
		}
	}

	/**
	 * Check if currently in a Zoom meeting
	 */
	private isInMeeting(): boolean {
		try {
			const checkMeetingScript = `
				tell application "System Events"
					tell process "zoom.us"
						try
							return exists menu bar item "Meeting" of menu bar 1
						on error
							return false
						end try
					end tell
				end tell
			`;
			const result = execSync(`osascript -e '${checkMeetingScript}'`).toString().trim();
			return result === "true";
		} catch {
			return false;
		}
	}

	/**
	 * Detect mute state using the reliable detection method
	 */
	private async detectMuteState(): Promise<'muted' | 'unmuted' | 'unknown'> {
		const zoomMonitor = ZoomMonitor.getInstance();
		return await zoomMonitor.detectZoomMuteState();
	}

	/**
	 * Update the button state based on actual Zoom mute status
	 */
	private async updateState(action: any): Promise<void> {
		try {
			const isZoomRunning = this.isZoomRunning();

			if (!isZoomRunning) {
				await action.setTitle("Zoom\nNot Running");
				return;
			}

			const isInMeeting = this.isInMeeting();
			if (!isInMeeting) {
				await action.setTitle("Not in\nMeeting");
				return;
			}

			const detectedState = await this.detectMuteState();

			if (detectedState !== 'unknown') {
				await this.setButtonState(action, detectedState);
			}

		} catch (error) {
			console.error("Failed to update Zoom mute state:", error);
			await action.setTitle("Error");
		}
	}

	/**
	 * Set the visual state of the button
	 */
	private async setButtonState(action: any, state: 'muted' | 'unmuted'): Promise<void> {
		if (state === 'muted') {
			await action.setState(0); // Muted state
		} else {
			await action.setState(1); // Unmuted state
		}
	}

	/**
	 * Periodically check state to catch external changes
	 */
	private startPeriodicStateCheck(action: any): void {
		// Check every 500 milliseconds for state changes
		this.stateCheckInterval = setInterval(async () => {
			// Only check if Zoom is running, in a meeting, and is the frontmost application
			if (this.isZoomRunning() && this.isInMeeting()) {
				await this.updateState(action);
			}
		}, 500);
	}
}

/**
 * Settings for {@link ZoomMuteToggle}.
 */
type ZoomMuteSettings = {
	controlMethod?: "keyboard" | "menubar";
	keyboardShortcut?: string;
};
