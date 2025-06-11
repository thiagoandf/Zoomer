import { action } from "@elgato/streamdeck";
import { ZoomToggleBase, ZoomToggleSettings } from "./zoom-toggle-base";
import { ZoomMonitor } from "./zoom-monitor";

/**
 * Action to toggle Zoom mute/unmute using AppleScript with improved reliability
 */
@action({ UUID: "com.thiagoandf.zoomer.mute-toggle" })
export class ZoomMuteToggle extends ZoomToggleBase<ZoomMuteSettings> {
	/**
	 * Get the default keyboard shortcut for mute toggle
	 */
	protected getDefaultShortcut(): string {
		return "cmd+shift+option+a";
	}

	/**
	 * Get the menubar script for mute toggle with fallback
	 */
	protected getMenubarScript(fallbackScript: string): string {
		return `
			tell application "System Events"
				tell process "zoom.us"
					try
						click menu item "Mute audio" of menu 1 of menu bar item "Meeting" of menu bar 1
					on error
						try
							click menu item "Unmute audio" of menu 1 of menu bar item "Meeting" of menu bar 1
						on error
							${fallbackScript}
						end try
					end try
				end tell
			end tell
		`;
	}

	/**
	 * Detect mute state using the ZoomMonitor
	 */
	protected async detectState(): Promise<string> {
		const zoomMonitor = ZoomMonitor.getInstance();
		return await zoomMonitor.detectZoomMuteState();
	}

	/**
	 * Set the visual state of the button based on mute state
	 */
	protected async setButtonState(action: any, state: string): Promise<void> {
		if (state === 'muted') {
			await action.setState(0); // Muted state
		} else if (state === 'unmuted') {
			await action.setState(1); // Unmuted state
		}
	}

	/**
	 * Get the action type for logging purposes
	 */
	protected getActionType(): string {
		return "mute";
	}
}

/**
 * Settings for {@link ZoomMuteToggle}.
 */
interface ZoomMuteSettings extends ZoomToggleSettings {
	// Mute toggle specific settings can be added here if needed
}
