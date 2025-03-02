import { App, TFile } from 'obsidian';
import { ChatStore, createEmptyChatStore } from '../models/ChatModel';

// File name where chat data will be stored
const CHAT_DATA_FILENAME = '.obsidian/plugins/obsidian-threaded-chat/chat-data.json';

export class StorageService {
    private app: App;
    
    constructor(app: App) {
        this.app = app;
    }
    
    /**
     * Saves the chat store to disk
     */
    async saveChatStore(store: ChatStore): Promise<void> {
        try {
            const serializedData = JSON.stringify(store, null, 2);
            await this.app.vault.adapter.write(CHAT_DATA_FILENAME, serializedData);
        } catch (error) {
            console.error('Failed to save chat store:', error);
            throw error;
        }
    }
    
    /**
     * Loads the chat store from disk
     */
    async loadChatStore(): Promise<ChatStore> {
        try {
            // Check if the file exists
            const exists = await this.app.vault.adapter.exists(CHAT_DATA_FILENAME);
            if (!exists) {
                // If it doesn't exist, create an empty store
                return createEmptyChatStore();
            }
            
            // Read and parse the file
            const serializedData = await this.app.vault.adapter.read(CHAT_DATA_FILENAME);
            return JSON.parse(serializedData) as ChatStore;
        } catch (error) {
            console.error('Failed to load chat store:', error);
            // Return an empty store if loading fails
            return createEmptyChatStore();
        }
    }
} 