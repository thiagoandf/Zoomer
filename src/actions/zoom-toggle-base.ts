import { SingletonAction, WillAppearEvent, KeyDownEvent, JsonObject } from "@elgato/streamdeck";
import { spawn } from "child_process";

/**
 * Configuration options for zoom toggle actions
 */
export interface ZoomToggleConfig {
  stateCheckInterval: number;
  stateUpdateDelay: number;
  activationDelay: number;
  maxRetryAttempts: number;
  retryDelay: number;
}

/**
 * Base settings interface for zoom toggle actions
 */
export interface ZoomToggleSettings extends JsonObject {
  controlMethod?: "keyboard" | "menubar";
  keyboardShortcut?: string;
}

/**
 * Base class for Zoom toggle actions to eliminate code duplication
 */
export abstract class ZoomToggleBase<T extends ZoomToggleSettings> extends SingletonAction<T> {
  protected stateCheckInterval?: NodeJS.Timeout;
  protected isUpdating = false;

  protected readonly config: ZoomToggleConfig = {
    stateCheckInterval: 1000,
    stateUpdateDelay: 1000,
    activationDelay: 100,
    maxRetryAttempts: 3,
    retryDelay: 200,
  };

  /**
   * Abstract methods to be implemented by subclasses
   */
  protected abstract getDefaultShortcut(): string;
  protected abstract getMenubarScript(fallbackScript: string): string;
  protected abstract detectState(): Promise<string>;
  protected abstract setButtonState(action: any, state: string): Promise<void>;
  protected abstract getActionType(): string;

  /**
   * Set the initial state when the action appears
   */
  override async onWillAppear(ev: WillAppearEvent<T>): Promise<void> {
    await this.updateState(ev.action);
    this.startPeriodicStateCheck(ev.action);
  }

  /**
   * Clean up when action disappears
   */
  override async onWillDisappear(): Promise<void> {
    this.cleanup();
  }

  /**
   * Handle key press to toggle state
   */
  override async onKeyDown(ev: KeyDownEvent<T>): Promise<void> {
    try {
      this.cleanup(); // Clean up any existing interval

      const isZoomRunning = await this.isZoomRunning();
      if (!isZoomRunning) {
        await ev.action.setTitle("Zoom\nNot Running");
        return;
      }

      const { settings } = ev.payload;
      const controlMethod = settings.controlMethod || "keyboard";
      const keyboardShortcut = this.validateKeyboardShortcut(
        settings.keyboardShortcut || this.getDefaultShortcut()
      );

      await this.executeToggleAction(controlMethod, keyboardShortcut);

      // Update state after a delay
      setTimeout(async () => {
        await this.updateState(ev.action);

        this.startPeriodicStateCheck(ev.action); // Restart periodic state check
      }, this.config.stateUpdateDelay);

    } catch (error) {
      console.error(`Failed to toggle Zoom ${this.getActionType()}:`, error);
      await ev.action.setTitle("Error");
    }
  }

  /**
   * Execute the toggle action with retry logic
   */
  private async executeToggleAction(controlMethod: string, keyboardShortcut: string): Promise<void> {
    let attempt = 0;
    while (attempt < this.config.maxRetryAttempts) {
      try {
        if (controlMethod === "menubar") {
          const fallbackScript = this.generateKeystrokeScript(keyboardShortcut);
          const appleScript = this.getMenubarScript(fallbackScript);
          await this.executeAppleScript(appleScript);
        } else {
          const appleScript = `
            tell application "zoom.us"
              activate
            end tell
            delay ${this.config.activationDelay / 1000}
            tell application "System Events"
              ${this.generateKeystrokeScript(keyboardShortcut)}
            end tell
          `;
          await this.executeAppleScript(appleScript);
        }
        return; // Success, exit retry loop
      } catch (error) {
        attempt++;
        if (attempt >= this.config.maxRetryAttempts) {
          throw error;
        }
        await this.delay(this.config.retryDelay * attempt); // Exponential backoff
      }
    }
  }

  /**
   * Generate AppleScript keystroke command from shortcut string
   */
  protected generateKeystrokeScript(shortcut: string): string {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);

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
      .filter(mod => mod)
      .join(', ');

    if (appleScriptModifiers) {
      return `keystroke "${key}" using {${appleScriptModifiers}}`;
    } else {
      return `keystroke "${key}"`;
    }
  }

  /**
   * Validate keyboard shortcut format
   */
  private validateKeyboardShortcut(shortcut: string): string {
    if (!shortcut || typeof shortcut !== 'string') {
      throw new Error(`Invalid keyboard shortcut: ${shortcut}`);
    }

    const parts = shortcut.toLowerCase().split('+');
    if (parts.length === 0) {
      throw new Error(`Invalid keyboard shortcut format: ${shortcut}`);
    }

    const validModifiers = ['cmd', 'command', 'shift', 'opt', 'option', 'alt', 'ctrl', 'control'];
    const modifiers = parts.slice(0, -1);

    for (const modifier of modifiers) {
      if (!validModifiers.includes(modifier)) {
        console.warn(`Unknown modifier '${modifier}' in shortcut: ${shortcut}`);
      }
    }

    return shortcut;
  }

  /**
   * Execute AppleScript asynchronously
   */
  protected async executeAppleScript(script: string): Promise<string> {
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
   * Check if Zoom is running asynchronously
   */
  protected async isZoomRunning(): Promise<boolean> {
    try {
      const result = await this.executeCommand('pgrep', ['-f', 'zoom.us']);
      return result.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if currently in a Zoom meeting
   */
  protected async isInMeeting(): Promise<boolean> {
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
      const result = await this.executeAppleScript(checkMeetingScript);

      console.log("isInMeeting", result);
      return result === "true";
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

  /**
   * Update the button state based on actual Zoom status
   */
  protected async updateState(action: any): Promise<void> {
    if (this.isUpdating) return; // Prevent concurrent updates

    this.isUpdating = true;
    try {
      const isZoomRunning = await this.isZoomRunning();

      if (!isZoomRunning) {
        await action.setTitle("Zoom\nNot Running");
        return;
      }

      const isInMeeting = await this.isInMeeting();
      if (!isInMeeting) {
        await action.setTitle("Not in\nMeeting");
        return;
      }

      const detectedState = await this.detectState();

      if (detectedState !== 'unknown') {
        await this.setButtonState(action, detectedState);
        await action.setTitle("");
      }

    } catch (error) {
      console.error(`Failed to update Zoom ${this.getActionType()} state:`, error);
      await action.setTitle("Error");
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Periodically check state to catch external changes
   */
  protected startPeriodicStateCheck(action: any): void {
    this.cleanup(); // Clean up any existing interval

    this.stateCheckInterval = setInterval(async () => {
      try {
        if (await this.isZoomRunning() && await this.isInMeeting()) {
          await this.updateState(action);
        }
      } catch (error) {
        console.error(`Error in periodic state check for ${this.getActionType()}:`, error);
      }
    }, this.config.stateCheckInterval);
  }

  /**
   * Clean up resources
   */
  protected cleanup(): void {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = undefined;
    }
  }

  /**
   * Utility method for delays
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
