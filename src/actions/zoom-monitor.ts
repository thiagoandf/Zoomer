import { spawn } from "child_process";

/**
 * Utility class for monitoring Zoom audio and video state
 * Uses simple, reliable detection methods with async operations
 */
export class ZoomMonitor {
	private static instance: ZoomMonitor;

	static getInstance(): ZoomMonitor {
		if (!ZoomMonitor.instance) {
			ZoomMonitor.instance = new ZoomMonitor();
		}
		return ZoomMonitor.instance;
	}

	/**
	 * Execute AppleScript asynchronously
	 */
	private async executeAppleScript(script: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const process = spawn('osascript', ['-e', script]);
			let stdout = '';
			let stderr = '';

			process.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			process.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			process.on('close', (code) => {
				if (code === 0) {
					resolve(stdout.trim());
				} else {
					reject(new Error(`AppleScript failed (code ${code}): ${stderr.trim()}`));
				}
			});

			process.on('error', (error) => {
				reject(new Error(`Failed to execute AppleScript: ${error.message}`));
			});
		});
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
						on error errMsg
							return "error: " & errMsg as string
						end try
					end tell
				end tell
			`;

			const result = await this.executeAppleScript(script);

			if (result === "muted" || result === "unmuted") {
				return result as 'muted' | 'unmuted';
			}

			if (result.startsWith("error:")) {
				console.warn("Zoom mute detection AppleScript error:", result);
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
						on error errMsg
							return "error: " & errMsg as string
						end try
					end tell
				end tell
			`;

			const result = await this.executeAppleScript(script);

			if (result === "video_on" || result === "video_off") {
				return result as 'video_on' | 'video_off';
			}

			if (result.startsWith("error:")) {
				console.warn("Zoom video detection AppleScript error:", result);
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

	/**
	 * Check if Zoom application is currently running
	 */
	async isZoomRunning(): Promise<boolean> {
		try {
			const result = await this.executeCommand('pgrep', ['-f', 'zoom.us']);
			return result.length > 0;
		} catch {
			return false;
		}
	}

	/**
	 * Execute shell command asynchronously
	 */
	private async executeCommand(command: string, args: string[]): Promise<string> {
		return new Promise((resolve, reject) => {
			const process = spawn(command, args);
			let stdout = '';
			let stderr = '';

			process.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			process.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			process.on('close', (code) => {
				if (code === 0) {
					resolve(stdout.trim());
				} else {
					reject(new Error(`Command failed (code ${code}): ${stderr.trim()}`));
				}
			});

			process.on('error', (error) => {
				reject(new Error(`Failed to execute command: ${error.message}`));
			});
		});
	}
}
