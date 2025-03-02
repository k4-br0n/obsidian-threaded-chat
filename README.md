# Obsidian Threaded Chat

An Obsidian plugin that adds Slack-like chat functionality to folders and notes with recursively nested threads.

## Features

- **Threaded Conversations**: Create chat threads in any folder or note
- **Recursive Threading**: Reply to any message to create nested threads
- **Nested Folder Structure**: Folder chats can display child folder/file threads
- **Rich UI**: Message reactions, breadcrumb navigation, and thread previews
- **Flexible Storage**: Store chat data centrally while maintaining references
- **Path Handling**: Automatically updates references when files/folders are renamed

## How It Works

Each folder and file in your vault can have chat threads associated with it. This creates a hierarchical communication system:

- **Folder Chats**: Discuss topics related to the folder's theme
- **File Chats**: Discuss content specific to a note
- **Child Threads**: See conversations from subfolders/files directly in the parent context
- **Message Threading**: Reply to specific messages to create nested threads

## Installation

1. Download the latest release from the [GitHub releases page](https://github.com/yourusername/obsidian-threaded-chat/releases)
2. Extract the zip file into your Obsidian plugins folder
3. Enable the plugin in Obsidian's Community Plugins settings

## Usage

### Basic Navigation

- Click the chat icon in the ribbon to open the chat panel
- The chat panel shows conversations for your current folder or file
- Navigate between folders/files using the breadcrumb trail at the top

### Sending Messages

- Type in the text area at the bottom of the panel and click "Send"
- To reply to a specific message, click "Reply" under that message
- When replying, you'll see an indicator showing which message you're replying to
- Click "Cancel" to cancel the reply and create a top-level message instead

### Viewing Threads

- Nested replies are indented under the parent message
- Toggle "Show Child Threads" to display or hide content from subfolders/files
- Click on folder/file names in the child threads section to navigate to them

### Message Actions

- **Reply**: Start a nested thread from any message
- **Reactions**: Add emoji reactions to messages (click the emoji button)
- **Context**: Click the folder/file reference to navigate to that location

## Settings

Access plugin settings by going to Settings > Community Plugins > Threaded Chat > Settings

- **User Name**: Set your display name in chats
- **User ID**: Your unique identifier for reactions (auto-generated)
- **Auto-show Chat**: Automatically open the chat panel when opening files
- **Show Child Threads**: Show threads from subfolders/files by default
- **Hide Empty Chats**: Hide folders/files with no messages
- **Storage Location**: Choose where to store chat data (plugin folder or vault root)
- **Export Chat Data**: Backup all your chat data to a JSON file

## Data Structure

Chat data is stored in a JSON file with the following structure:

- **Messages**: Keyed by unique IDs, containing content, timestamps, and references
- **Path Index**: Maps vault paths to message IDs for efficient lookup
- **Threads**: Created dynamically by organizing messages based on parentId references

## Development

### Prerequisites

- Node.js and npm
- Obsidian development environment

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development build process

### Building

- Run `npm run build` to create a production build

## Testing

The plugin handles various edge cases:

- **File/Folder Renames**: References are updated automatically
- **File/Folder Moves**: Chat data follows the file/folder to its new location
- **File/Folder Deletion**: Chat history is preserved even if the file is deleted
- **Large Folders**: Performance optimizations for folders with many files and threads

## License

This project is licensed under the MIT License - see the LICENSE file for details. 