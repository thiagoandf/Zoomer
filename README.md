# Zoomer - Stream Deck Zoom Control Plugin

A reliable Stream Deck plugin that provides seamless Zoom control using advanced AppleScript detection on macOS.

## Features

- **🎙️ Mute/Unmute Toggle**: Control your microphone with instant visual feedback
- **📹 Video On/Off Toggle**: Control your camera with instant visual feedback
- **🎯 Reliable State Detection**: Uses button description detection for accurate state reading
- **⚡ Optimistic UI Updates**: Buttons respond immediately for better user experience
- **🔄 Real-time Monitoring**: Automatically syncs with external Zoom changes
- **⌨️ Customizable Shortcuts**: Set your own keyboard shortcuts for both actions
- **🎛️ Dual Control Methods**: Choose between keyboard shortcuts or menu bar actions
- **🚫 Non-intrusive**: No disruptive menu popups or UI interference
- **✅ Smart Detection**: Only monitors when Zoom is active and you're in a meeting

## Installation

1. Build the plugin:
   ```bash
   npm install
   npm run build
   ```

2. Install the plugin in Stream Deck:
   - Copy the `com.thiagoandf.zoomer.sdPlugin` folder to your Stream Deck plugins directory
   - Or double-click the `.sdPlugin` folder to install it automatically

## Usage

### Mute/Unmute Control
- **Button State 1**: Microphone is unmuted (typically green)
- **Button State 0**: Microphone is muted (typically red)
- **Press**: Toggles mute state with immediate visual feedback
- **Auto-sync**: Catches changes made through Zoom's native controls

### Video Control
- **Button State 1**: Camera is on (typically green)
- **Button State 0**: Camera is off (typically red)
- **Press**: Toggles video state with immediate visual feedback
- **Auto-sync**: Catches changes made through Zoom's native controls

## Configuration

### Control Methods
Each action supports two control methods:

1. **Keyboard Shortcut (Recommended)**
   - Fast and reliable
   - Customizable shortcuts
   - Works with Zoom's global shortcuts
   - Default: `cmd+shift+option+a` (mute), `cmd+shift+v` (video)

2. **Menu Bar Action**
   - Clicks Zoom's menu bar items
   - Falls back to keyboard shortcuts if menu items unavailable
   - Good compatibility across Zoom versions

### Customizable Keyboard Shortcuts

You can now set custom keyboard shortcuts for each action:

#### Shortcut Format
Use the format: `modifier+modifier+key`

**Supported Modifiers:**
- `cmd` or `command` → Command key
- `shift` → Shift key
- `opt`, `option`, or `alt` → Option/Alt key
- `ctrl` or `control` → Control key

#### Examples
```
cmd+shift+option+a    (Zoom's default mute)
cmd+shift+a           (simplified)
cmd+shift+m           (different key)
ctrl+shift+m          (Control-based)
f1                    (function key only)
```

### How to Configure
1. Right-click on the action in Stream Deck
2. Select the Property Inspector
3. Choose your control method (keyboard/menubar)
4. Set your custom keyboard shortcut
5. Settings save automatically

## Requirements

- macOS 12 or later
- Stream Deck software 6.5 or later
- Zoom desktop application
- Accessibility permissions for Stream Deck

## Setup

1. **Install Zoom**: Make sure Zoom desktop app is installed
2. **Grant Accessibility Permissions**:
   - Go to System Preferences → Security & Privacy → Privacy → Accessibility
   - Add Stream Deck to the allowed applications list
   - Restart Stream Deck after granting permissions
3. **Add Actions**: Drag Zoom control actions from the "Zoomer" category to your Stream Deck
4. **Configure**: Set your preferred control methods and keyboard shortcuts

## How It Works

### Reliable Detection Method
The plugin uses a robust detection system that checks Zoom's UI button descriptions:

**Audio State Detection:**
- **Muted**: Looks for buttons with "Unmute my audio" description
- **Unmuted**: Looks for buttons with "Mute my audio" description

**Video State Detection:**
- **Video Off**: Looks for buttons with "Start video" description
- **Video On**: Looks for buttons with "Stop video" description

### Smart Behavior
- **Optimistic Updates**: Buttons update immediately when pressed for responsive UX
- **Background Verification**: Actual state is verified after 800ms delay
- **Periodic Monitoring**: Checks state every 5 seconds when Zoom is active
- **Non-intrusive**: Only monitors when Zoom is the frontmost application
- **Intelligent Detection**: Works with any Zoom window containing "Zoom" in the title

### Control Execution
1. **Process Check**: Verifies Zoom is running (`zoom.us` process)
2. **Meeting Check**: Confirms you're in an active meeting
3. **Execute Action**: Uses your chosen control method
4. **Update Display**: Immediately updates button for responsive feel
5. **Verify State**: Confirms actual state after brief delay

## State Display

| Display | Meaning |
|---------|---------|
| Normal state icons | In meeting, state detected successfully |
| "Zoom Not Running" | Zoom application is not running |
| "Not in Meeting" | Zoom is running but not in an active meeting |
| "Error" | Action failed to execute |

## Reliability Improvements

This plugin implements several reliability enhancements:

- **🎯 Button Description Detection**: More reliable than menu bar checking
- **🔄 Multiple Fallback Methods**: Graceful degradation when detection fails
- **⚡ Optimistic UI**: Immediate feedback prevents user confusion
- **📊 Periodic Sync**: Catches external changes (using Zoom's native controls)
- **🚫 Non-disruptive**: No menu popups or UI interference
- **🎛️ Smart Timing**: Only monitors when necessary

## Troubleshooting

### Common Issues

**"Zoom Not Running"**
- Ensure Zoom desktop app is installed and running
- Plugin detects the `zoom.us` process

**"Not in Meeting"**
- Join a Zoom meeting for full functionality
- Some features only work during active meetings

**Shortcuts Not Working**
- Verify Zoom has keyboard shortcuts enabled in Preferences
- Check Stream Deck has Accessibility permissions
- Try switching to "Menu Bar" control method
- Restart Stream Deck after granting permissions

**State Not Updating**
- Ensure you're in an active Zoom meeting
- Check that Zoom is the frontmost application for periodic updates
- Try pressing the button to trigger manual state update

**Button Not Responsive**
- Check Accessibility permissions
- Verify Zoom window contains "Zoom" in title
- Try different keyboard shortcut combinations

### Advanced Troubleshooting

If issues persist:
1. Check Stream Deck console for error messages
2. Verify Zoom's UI language is set to English
3. Try restarting both Zoom and Stream Deck
4. Test with Zoom's default keyboard shortcuts first

## Development

### Building
```bash
npm run build
```

### Testing
A test script is available to verify detection methods:
```bash
# Join a Zoom meeting first
npx ts-node src/test-zoom-detection.ts
```

### Project Structure
```
src/
├── plugin.ts                     # Main plugin entry point
├── actions/
│   ├── zoom-mute-toggle.ts      # Mute control with advanced detection
│   ├── zoom-video-toggle.ts     # Video control with advanced detection
│   └── zoom-audio-monitor.ts    # Shared detection utilities
com.thiagoandf.zoomer.sdPlugin/
├── manifest.json                # Plugin metadata
├── ui/                         # Property inspector HTML
└── imgs/                       # Button icons and assets
```

## License

This project is open source and available under the MIT License.
