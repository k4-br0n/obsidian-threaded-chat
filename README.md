# Obsidian Threaded Chat Plugin

A plugin for [Obsidian](https://obsidian.md) that adds Slack-like chat functionality to folders and notes with recursively nested threads.

## Features

- Chat at any level of your vault (folder or note)
- Threaded conversations with unlimited nesting depth
- Reply to any message to create a nested thread
- Messages are saved and persist between sessions
- Chat UI adapts to the current active file or folder

## How It Works

The plugin maintains a chat history for each folder and note in your vault. Each conversation can have threaded replies, and those replies can have their own replies, creating a recursive threading model like Slack.

Key concepts:

- **Folder Chats**: Every folder has its own top-level chat thread
- **Note Chats**: Every note also has its own chat thread
- **Nested Threading**: Any message can be replied to, creating a sub-thread
- **Persistence**: All chat messages are stored and maintained even if files or folders are renamed or moved

## Getting Started

1. Open a file or folder in your vault
2. Click the chat icon in the ribbon or use the "Open Threaded Chat" command
3. The chat panel will open showing conversations for the current context
4. Type your message and press Send or Enter to post
5. Reply to any message by clicking the Reply button

## Data Storage

Chat data is stored in a JSON file within your `.obsidian/plugins` directory. The plugin uses a relational model to maintain relationships between messages and threads, while also tracking references to your vault's folder and file structure.

## Settings

Currently, the plugin has minimal settings, but future versions will include:

- Customizable user name and ID
- Theme options
- Notification preferences
- Data export/import options

## Developer Notes

This plugin is built with TypeScript and follows Obsidian's plugin architecture guidelines. The code is organized into:

- Models: Data structures for messages and threads
- Services: Components handling data persistence
- UI: View components for rendering the chat interface
- Main: Core plugin functionality and Obsidian integration

## Testing Plan

When testing this plugin, follow these steps:

1. Create multiple nested folders and notes
2. Add chat messages at various levels
3. Create multiple nested threads
4. Rename files and folders to verify references remain intact
5. Move files between folders to test path updates
6. Reopen Obsidian to test data persistence

## License

This plugin is licensed under MIT.

## Support

If you encounter issues or have feature suggestions, please open an issue on the GitHub repository. 