import { execSync } from "child_process";

/**
 * Utility class for monitoring Zoom audio and video state
 * Uses simple, reliable detection methods
 */
export class ZoomAudioMonitor {
	private static instance: ZoomAudioMonitor;

	static getInstance(): ZoomAudioMonitor {
		if (!ZoomAudioMonitor.instance) {
			ZoomAudioMonitor.instance = new ZoomAudioMonitor();
		}
		return ZoomAudioMonitor.instance;
	}

	/**
	 * Detect Zoom mute state using reliable button description checking
	 */
	async detectZoomMuteState(): Promise<'muted' | 'unmuted' | 'unknown'> {
		try {
			const script = `
				tell application "System Events"
					tell process "zoom.us"
						try
							set zoomWindows to every window whose name contains "Zoom"
							if (count of zoomWindows) is 0 then return "no_meeting"

							repeat with zoomWindow in zoomWindows
								set matchingButtons to (every button of zoomWindow whose description contains "Unmute my audio")
								if (count of matchingButtons) > 0 then
									return "muted"
								end if

								set matchingButtons to (every button of zoomWindow whose description contains "Mute my audio")
								if (count of matchingButtons) > 0 then
									return "unmuted"
								end if
							end repeat

							return "unknown"
						on error
							return "error"
						end try
					end tell
				end tell
			`;

			const result = execSync(`osascript -e '${script}'`).toString().trim();

			if (result === "muted" || result === "unmuted") {
				return result as 'muted' | 'unmuted';
			}

			return 'unknown';
		} catch (error) {
			console.error("Zoom mute detection failed:", error);
			return 'unknown';
		}
	}

	/**
	 * Detect Zoom video state using reliable button description checking
	 */
	async detectZoomVideoState(): Promise<'video_on' | 'video_off' | 'unknown'> {
		try {
			const script = `
				tell application "System Events"
					tell process "zoom.us"
						try
							set zoomWindows to every window whose name contains "Zoom"
							if (count of zoomWindows) is 0 then return "no_meeting"

							repeat with zoomWindow in zoomWindows
								set matchingButtons to (every button of zoomWindow whose description contains "Start video")
								if (count of matchingButtons) > 0 then
									return "video_off"
								end if

								set matchingButtons to (every button of zoomWindow whose description contains "Stop video")
								if (count of matchingButtons) > 0 then
									return "video_on"
								end if
							end repeat

							return "unknown"
						on error
							return "error"
						end try
					end tell
				end tell
			`;

			const result = execSync(`osascript -e '${script}'`).toString().trim();

			if (result === "video_on" || result === "video_off") {
				return result as 'video_on' | 'video_off';
			}

			return 'unknown';
		} catch (error) {
			console.error("Zoom video detection failed:", error);
			return 'unknown';
		}
	}

	/**
	 * Get audio state with confidence level
	 */
	async getAudioState(): Promise<{
		zoomState: 'muted' | 'unmuted' | 'unknown';
		confidence: 'high' | 'low';
	}> {
		const zoomState = await this.detectZoomMuteState();

		return {
			zoomState,
			confidence: zoomState !== 'unknown' ? 'high' : 'low',
		};
	}

	/**
	 * Get video state with confidence level
	 */
	async getVideoState(): Promise<{
		zoomState: 'video_on' | 'video_off' | 'unknown';
		confidence: 'high' | 'low';
	}> {
		const zoomState = await this.detectZoomVideoState();

		return {
			zoomState,
			confidence: zoomState !== 'unknown' ? 'high' : 'low',
		};
	}
}
