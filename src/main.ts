import { Plugin, WorkspaceLeaf, TFile, TFolder, Notice, PluginSettingTab, App, Setting } from 'obsidian';
import { ChatStore, ObsidianPath, updateMessagePath } from './models/ChatModel';
import { StorageService } from './services/StorageService';
import { ThreadedChatView, VIEW_TYPE_THREADED_CHAT } from './ui/ThreadedChatView';

// Define plugin settings interface
interface ThreadedChatPluginSettings {
    userName: string;
    userId: string;
    autoShowChat: boolean;
    storageLocation: 'plugin' | 'vault';
    hideEmptyChats: boolean;
    defaultShowChildThreads: boolean;
}

// Default settings
const DEFAULT_SETTINGS: ThreadedChatPluginSettings = {
    userName: 'User',
    userId: 'user-1',
    autoShowChat: true,
    storageLocation: 'plugin',
    hideEmptyChats: false,
    defaultShowChildThreads: true
};

export default class ThreadedChatPlugin extends Plugin {
    private chatStore: ChatStore;
    private storageService: StorageService;
    settings: ThreadedChatPluginSettings;
    
    // Track the active view
    private activeView: ThreadedChatView | null = null;

    async onload() {
        console.log('Loading Threaded Chat plugin');

        // Load settings
        await this.loadSettings();

        // Initialize services
        this.storageService = new StorageService(this.app, this.settings);

        // Load saved chat data
        this.chatStore = await this.storageService.loadChatStore();

        // Register the view
        this.registerView(
            VIEW_TYPE_THREADED_CHAT,
            (leaf: WorkspaceLeaf) => {
                this.activeView = new ThreadedChatView(leaf, this);
                return this.activeView;
            }
        );

        // Add the ribbon icon and command
        this.addRibbonIcon('message-square', 'Open Threaded Chat', () => {
            this.activateView();
        });

        // Add a command to open the chat view
        this.addCommand({
            id: 'open-threaded-chat',
            name: 'Open Threaded Chat',
            callback: () => {
                this.activateView();
            }
        });
        
        // Add a command to toggle child threads
        this.addCommand({
            id: 'toggle-child-threads',
            name: 'Toggle Child Threads Visibility',
            callback: () => {
                if (this.activeView) {
                    this.activeView.toggleChildThreads();
                }
            }
        });
        
        // Add command to reply to last message
        this.addCommand({
            id: 'reply-to-last-message',
            name: 'Reply to Last Message',
            callback: () => {
                if (this.activeView) {
                    this.activeView.replyToLastMessage();
                }
            }
        });

        // Register event handlers for file/folder operations
        this.registerFileEvents();
        
        // Auto-open chat view if enabled in settings
        if (this.settings.autoShowChat) {
            this.app.workspace.onLayoutReady(() => {
                this.activateView();
            });
        }
        
        // Add settings tab
        this.addSettingTab(new ThreadedChatSettingTab(this.app, this));
    }

    async onunload() {
        console.log('Unloading Threaded Chat plugin');
        
        // Save chat data
        await this.storageService.saveChatStore(this.chatStore);
    }
    
    // Load settings
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    // Save settings
    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update service with new settings
        if (this.storageService) {
            this.storageService.updateSettings(this.settings);
        }
        
        // Update active view with new settings
        if (this.activeView) {
            this.activeView.updateSettings(this.settings);
        }
    }

    // Get the current chat store
    getChatStore(): ChatStore {
        return this.chatStore;
    }

    // Update the chat store
    updateChatStore(newStore: ChatStore) {
        this.chatStore = newStore;
        // Save on updates
        this.storageService.saveChatStore(newStore);
    }

    // Activate the threaded chat view
    async activateView() {
        const { workspace } = this.app;
        
        // Check if the view is already open
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_THREADED_CHAT)[0];
        
        if (!leaf) {
            // If not open, create a new leaf in the right sidebar
            const rightSideLeaf = workspace.getRightLeaf(false);
            if (rightSideLeaf) {
                leaf = rightSideLeaf;
                await leaf.setViewState({
                    type: VIEW_TYPE_THREADED_CHAT,
                    active: true
                });
            } else {
                // If we can't get the right leaf for some reason, bail out
                console.error("Could not create leaf for threaded chat view");
                return;
            }
        }
        
        // Reveal the leaf
        workspace.revealLeaf(leaf);
        
        // Set active view reference
        const view = leaf.view;
        if (view instanceof ThreadedChatView) {
            this.activeView = view;
        }
    }

    // Register event handlers for file/folder operations
    private registerFileEvents() {
        // Handle file renames
        this.registerEvent(
            this.app.vault.on('rename', (file, oldPath) => {
                const newPath: ObsidianPath = {
                    path: file.path,
                    type: file instanceof TFolder ? 'folder' : 'file'
                };
                
                const oldObsidianPath: ObsidianPath = {
                    path: oldPath,
                    type: file instanceof TFolder ? 'folder' : 'file'
                };
                
                // If it's a folder, we need to update all files within that folder too
                if (file instanceof TFolder) {
                    new Notice(`Updating chat references for renamed folder: ${oldPath} → ${file.path}`);
                }
                
                // Update messages that reference the old path
                const updatedStore = updateMessagePath(this.chatStore, oldObsidianPath, newPath);
                this.updateChatStore(updatedStore);
                
                // Refresh the view if open
                if (this.activeView) {
                    this.activeView.refreshView();
                }
            })
        );
        
        // Handle file deletions
        this.registerEvent(
            this.app.vault.on('delete', (file) => {
                // We keep messages for deleted files for historical purposes
                // But notify the user
                new Notice(`Note: Chat messages for deleted ${file instanceof TFolder ? 'folder' : 'file'} "${file.path}" are preserved`);
            })
        );
        
        // Listen for active file changes to auto-update view
        this.registerEvent(
            this.app.workspace.on('file-open', (file: TFile | null) => {
                // If auto-show chat is enabled, make sure the view is open
                if (file && this.settings.autoShowChat) {
                    this.activateView();
                }
                
                // The view itself will handle updating to the current file
            })
        );
    }
}

// Settings tab
class ThreadedChatSettingTab extends PluginSettingTab {
    plugin: ThreadedChatPlugin;

    constructor(app: App, plugin: ThreadedChatPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Threaded Chat Settings' });

        new Setting(containerEl)
            .setName('User Name')
            .setDesc('Your display name in chats')
            .addText(text => text
                .setPlaceholder('User')
                .setValue(this.plugin.settings.userName)
                .onChange(async (value) => {
                    this.plugin.settings.userName = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(containerEl)
            .setName('User ID')
            .setDesc('Your unique ID for reactions and mentions (no spaces)')
            .addText(text => text
                .setPlaceholder('user-1')
                .setValue(this.plugin.settings.userId)
                .onChange(async (value) => {
                    // Sanitize: remove spaces and special characters
                    const sanitized = value.replace(/[^a-zA-Z0-9-_]/g, '');
                    this.plugin.settings.userId = sanitized;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Auto-show Chat')
            .setDesc('Automatically open chat view when opening a file')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoShowChat)
                .onChange(async (value) => {
                    this.plugin.settings.autoShowChat = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(containerEl)
            .setName('Show Child Threads')
            .setDesc('Show threads from child folders and files by default')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.defaultShowChildThreads)
                .onChange(async (value) => {
                    this.plugin.settings.defaultShowChildThreads = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(containerEl)
            .setName('Hide Empty Chats')
            .setDesc('Hide folders and files with no messages')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideEmptyChats)
                .onChange(async (value) => {
                    this.plugin.settings.hideEmptyChats = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(containerEl)
            .setName('Storage Location')
            .setDesc('Where to store chat data')
            .addDropdown(dropdown => dropdown
                .addOption('plugin', 'Plugin folder')
                .addOption('vault', 'Vault root')
                .setValue(this.plugin.settings.storageLocation)
                .onChange(async (value: 'plugin' | 'vault') => {
                    this.plugin.settings.storageLocation = value;
                    await this.plugin.saveSettings();
                }));
                
        // Add button to export/backup chat data
        new Setting(containerEl)
            .setName('Export Chat Data')
            .setDesc('Export all chat data to a JSON file')
            .addButton(button => button
                .setButtonText('Export')
                .onClick(async () => {
                    const jsonData = JSON.stringify(this.plugin.getChatStore(), null, 2);
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `obsidian-threaded-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    
                    URL.revokeObjectURL(url);
                    new Notice('Chat data exported successfully');
                }));
    }
} 