import { action } from "@elgato/streamdeck";
import { ZoomToggleBase, ZoomToggleSettings } from "./zoom-toggle-base";
import { ZoomMonitor } from "./zoom-monitor";

/**
 * Action to toggle Zoom video on/off using AppleScript with improved reliability
 */
@action({ UUID: "com.thiagoandf.zoomer.video-toggle" })
export class ZoomVideoToggle extends ZoomToggleBase<ZoomVideoSettings> {
	/**
	 * Get the default keyboard shortcut for video toggle
	 */
	protected getDefaultShortcut(): string {
		return "cmd+shift+v";
	}

	/**
	 * Get the menubar script for video toggle with fallback
	 */
	protected getMenubarScript(fallbackScript: string): string {
		return `
			tell application "System Events"
				tell process "zoom.us"
					try
						click menu item "Stop Video" of menu 1 of menu bar item "Meeting" of menu bar 1
					on error
						try
							click menu item "Start Video" of menu 1 of menu bar item "Meeting" of menu bar 1
						on error
							${fallbackScript}
						end try
					end try
				end tell
			end tell
		`;
	}

	/**
	 * Detect video state using the ZoomMonitor
	 */
	protected async detectState(): Promise<string> {
		const zoomMonitor = ZoomMonitor.getInstance();
		return await zoomMonitor.detectZoomVideoState();
	}

	/**
	 * Set the visual state of the button based on video state
	 */
	protected async setButtonState(action: any, state: string): Promise<void> {
		if (state === 'video_off') {
			await action.setState(0); // Video off state
		} else if (state === 'video_on') {
			await action.setState(1); // Video on state
		}
	}

	/**
	 * Get the action type for logging purposes
	 */
	protected getActionType(): string {
		return "video";
	}
}

/**
 * Settings for {@link ZoomVideoToggle}.
 */
interface ZoomVideoSettings extends ZoomToggleSettings {
	// Video toggle specific settings can be added here if needed
}
