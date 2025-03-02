import { App, TFile } from 'obsidian';
import { ChatStore, createEmptyChatStore } from '../models/ChatModel';

// Filename paths
const PLUGIN_DATA_FILENAME = '.obsidian/plugins/obsidian-threaded-chat/chat-data.json';
const VAULT_DATA_FILENAME = '.chat-data.json';

interface StorageSettings {
    userName: string;
    userId: string;
    storageLocation: 'plugin' | 'vault';
    // Add any other settings that affect storage
}

export class StorageService {
    private app: App;
    private settings: StorageSettings;
    
    constructor(app: App, settings: StorageSettings) {
        this.app = app;
        this.settings = settings;
    }
    
    /**
     * Update settings
     */
    updateSettings(newSettings: StorageSettings) {
        this.settings = newSettings;
    }
    
    /**
     * Get the appropriate filename based on settings
     */
    private getDataFilename(): string {
        return this.settings.storageLocation === 'vault' 
            ? VAULT_DATA_FILENAME 
            : PLUGIN_DATA_FILENAME;
    }
    
    /**
     * Saves the chat store to disk
     */
    async saveChatStore(store: ChatStore): Promise<void> {
        try {
            const serializedData = JSON.stringify(store, null, 2);
            const filename = this.getDataFilename();
            await this.app.vault.adapter.write(filename, serializedData);
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
            const filename = this.getDataFilename();
            
            // Check if the file exists
            const exists = await this.app.vault.adapter.exists(filename);
            if (!exists) {
                // Check the alternate location in case settings changed
                const altFilename = filename === PLUGIN_DATA_FILENAME 
                    ? VAULT_DATA_FILENAME 
                    : PLUGIN_DATA_FILENAME;
                
                const altExists = await this.app.vault.adapter.exists(altFilename);
                
                if (altExists) {
                    // If data exists in the alternate location, load from there
                    console.log(`Data found in alternate location: ${altFilename}`);
                    const serializedData = await this.app.vault.adapter.read(altFilename);
                    return JSON.parse(serializedData) as ChatStore;
                }
                
                // If it doesn't exist anywhere, create an empty store
                return createEmptyChatStore();
            }
            
            // Read and parse the file
            const serializedData = await this.app.vault.adapter.read(filename);
            return JSON.parse(serializedData) as ChatStore;
        } catch (error) {
            console.error('Failed to load chat store:', error);
            // Return an empty store if loading fails
            return createEmptyChatStore();
        }
    }
} 