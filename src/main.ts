import { Plugin, WorkspaceLeaf, TFile, TFolder } from 'obsidian';
import { ChatStore, ObsidianPath, updateMessagePath } from './models/ChatModel';
import { StorageService } from './services/StorageService';
import { ThreadedChatView, VIEW_TYPE_THREADED_CHAT } from './ui/ThreadedChatView';

export default class ThreadedChatPlugin extends Plugin {
    private chatStore: ChatStore;
    private storageService: StorageService;

    async onload() {
        console.log('Loading Threaded Chat plugin');

        // Initialize services
        this.storageService = new StorageService(this.app);

        // Load saved chat data
        this.chatStore = await this.storageService.loadChatStore();

        // Register the view
        this.registerView(
            VIEW_TYPE_THREADED_CHAT,
            (leaf: WorkspaceLeaf) => new ThreadedChatView(leaf, this)
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

        // Register event handlers for file/folder operations
        this.registerFileEvents();
    }

    async onunload() {
        console.log('Unloading Threaded Chat plugin');
        
        // Save chat data
        await this.storageService.saveChatStore(this.chatStore);
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
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({
                type: VIEW_TYPE_THREADED_CHAT,
                active: true
            });
        }
        
        // Reveal the leaf
        workspace.revealLeaf(leaf);
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
                
                // Update messages that reference the old path
                const updatedStore = updateMessagePath(this.chatStore, oldObsidianPath, newPath);
                this.updateChatStore(updatedStore);
            })
        );
        
        // Handle file deletions
        this.registerEvent(
            this.app.vault.on('delete', (file) => {
                // Currently we don't delete associated messages, 
                // as users might want to keep discussion history
                // This could be an option in the future
            })
        );
    }
} 