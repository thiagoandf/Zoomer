import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { execSync } from "child_process";
import { ZoomAudioMonitor } from "./zoom-audio-monitor";

/**
 * Action to toggle Zoom video on/off using AppleScript with improved reliability
 */
@action({ UUID: "com.thiagoandf.zoomer.video-toggle" })
export class ZoomVideoToggle extends SingletonAction<ZoomVideoSettings> {
	private lastKnownState: 'video_on' | 'video_off' | 'unknown' = 'unknown';
	private stateCheckInterval?: NodeJS.Timeout;

	/**
	 * Set the initial state when the action appears
	 */
	override async onWillAppear(ev: WillAppearEvent<ZoomVideoSettings>): Promise<void> {
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
	 * Handle key press to toggle video state
	 */
	override async onKeyDown(ev: KeyDownEvent<ZoomVideoSettings>): Promise<void> {
		try {
			// Check if Zoom is running first
			const isZoomRunning = this.isZoomRunning();
			if (!isZoomRunning) {
				await ev.action.setTitle("Zoom\nNot Running");
				return;
			}

			const { settings } = ev.payload;
			const controlMethod = settings.controlMethod || "keyboard";
			const keyboardShortcut = settings.keyboardShortcut || "cmd+shift+v";

			let appleScript: string;

			if (controlMethod === "menubar") {
				// Use menu bar approach
				appleScript = `
					tell application "System Events"
						tell process "zoom.us"
							try
								click menu item "Stop Video" of menu 1 of menu bar item "Meeting" of menu bar 1
							on error
								try
									click menu item "Start Video" of menu 1 of menu bar item "Meeting" of menu bar 1
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

			// Optimistically update state immediately for better UX
			const newState = this.lastKnownState === 'video_on' ? 'video_off' : 'video_on';
			await this.setButtonState(ev.action, newState);
			this.lastKnownState = newState;

			// Verify actual state after a reasonable delay
			setTimeout(async () => {
				await this.updateState(ev.action);
			}, 800);

		} catch (error) {
			console.error("Failed to toggle Zoom video:", error);
			await ev.action.setTitle("Error");
		}
	}

	/**
	 * Generate AppleScript keystroke command from shortcut string
	 * @param shortcut - String like "cmd+shift+v" or "cmd+shift+option+v"
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
	 * Check if Zoom is the frontmost (active) application
	 */
	private isZoomFrontmost(): boolean {
		try {
			const script = `
				tell application "System Events"
					set frontApp to name of first application process whose frontmost is true
					return frontApp is "zoom.us"
				end tell
			`;
			const result = execSync(`osascript -e '${script}'`).toString().trim();
			return result === "true";
		} catch {
			return false;
		}
	}

	/**
	 * Detect video state using the reliable detection method
	 */
	private async detectVideoState(): Promise<'video_on' | 'video_off' | 'unknown'> {
		const audioMonitor = ZoomAudioMonitor.getInstance();
		return await audioMonitor.detectZoomVideoState();
	}

	/**
	 * Update the button state based on actual Zoom video status
	 */
	private async updateState(action: any): Promise<void> {
		try {
			const isZoomRunning = this.isZoomRunning();

			if (!isZoomRunning) {
				await action.setTitle("Zoom\nNot Running");
				this.lastKnownState = 'unknown';
				return;
			}

			const isInMeeting = this.isInMeeting();
			if (!isInMeeting) {
				await action.setTitle("Not in\nMeeting");
				this.lastKnownState = 'unknown';
				return;
			}

			const detectedState = await this.detectVideoState();

			console.log("detectedState", detectedState);

			if (detectedState !== 'unknown') {
				await this.setButtonState(action, detectedState);
				this.lastKnownState = detectedState;
			} else {
				// Keep last known state if we can't detect current state
				await action.setTitle("Zoom\nMeeting");
			}

		} catch (error) {
			console.error("Failed to update Zoom video state:", error);
			await action.setTitle("Error");
		}
	}

	/**
	 * Set the visual state of the button
	 */
	private async setButtonState(action: any, state: 'video_on' | 'video_off'): Promise<void> {
		if (state === 'video_off') {
			await action.setState(0); // Video off state (typically red/off)
		} else {
			await action.setState(1); // Video on state (typically green/on)
		}
	}

	/**
	 * Periodically check state to catch external changes
	 */
	private startPeriodicStateCheck(action: any): void {
		// Check every 5 seconds for state changes (reduced frequency to be less intrusive)
		this.stateCheckInterval = setInterval(async () => {
			// Only check if Zoom is running, in a meeting, and is the frontmost application
			if (this.isZoomRunning() && this.isInMeeting() && this.isZoomFrontmost()) {
				await this.updateState(action);
			}
		}, 5000);
	}
}

/**
 * Settings for {@link ZoomVideoToggle}.
 */
type ZoomVideoSettings = {
	controlMethod?: "keyboard" | "menubar";
	keyboardShortcut?: string;
};
