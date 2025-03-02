// Represents a path to a folder or file in Obsidian
export interface ObsidianPath {
    path: string;
    type: 'folder' | 'file';
}

// Represents a single chat message
export interface ChatMessage {
    id: string;
    content: string;
    timestamp: number;
    authorName: string;
    authorId: string;
    parentId?: string; // For threading, references another message
    targetPath: ObsidianPath; // The folder or file this message belongs to
    reactions?: { [emoji: string]: string[] }; // User IDs who reacted with each emoji
}

// Represents a collection of messages as a thread
export interface ChatThread {
    rootMessage: ChatMessage;
    replies: ChatMessage[];
}

// Main data store for all chats
export interface ChatStore {
    messages: { [messageId: string]: ChatMessage };
    pathIndex: { [path: string]: string[] }; // Maps paths to message IDs
}

// Default empty store
export const createEmptyChatStore = (): ChatStore => ({
    messages: {},
    pathIndex: {}
});

// Function to add a message to the store
export function addMessage(store: ChatStore, message: ChatMessage): ChatStore {
    // Create a copy of the store to maintain immutability
    const newStore: ChatStore = {
        messages: { ...store.messages },
        pathIndex: { ...store.pathIndex }
    };
    
    // Add the message to the messages object
    newStore.messages[message.id] = message;
    
    // Add the message ID to the path index
    const pathKey = `${message.targetPath.type}:${message.targetPath.path}`;
    if (!newStore.pathIndex[pathKey]) {
        newStore.pathIndex[pathKey] = [];
    }
    newStore.pathIndex[pathKey].push(message.id);
    
    return newStore;
}

// Function to get all messages for a specific path
export function getMessagesForPath(store: ChatStore, path: ObsidianPath): ChatMessage[] {
    const pathKey = `${path.type}:${path.path}`;
    const messageIds = store.pathIndex[pathKey] || [];
    return messageIds.map(id => store.messages[id]);
}

// Function to get a thread (a message and all its replies)
export function getThread(store: ChatStore, rootMessageId: string): ChatThread | null {
    const rootMessage = store.messages[rootMessageId];
    if (!rootMessage) return null;
    
    // Find all replies to this message
    const replies = Object.keys(store.messages)
        .filter(id => store.messages[id].parentId === rootMessageId)
        .map(id => store.messages[id]);
    
    return { rootMessage, replies };
}

// Functions to handle path changes (renames, moves)
export function updateMessagePath(store: ChatStore, oldPath: ObsidianPath, newPath: ObsidianPath): ChatStore {
    const oldPathKey = `${oldPath.type}:${oldPath.path}`;
    const newPathKey = `${newPath.type}:${newPath.path}`;
    
    // If no messages at this path, nothing to do
    if (!store.pathIndex[oldPathKey]) return store;
    
    const messageIdsToUpdate = [...store.pathIndex[oldPathKey]];
    
    // Create a copy of the store
    const newStore: ChatStore = {
        messages: { ...store.messages },
        pathIndex: { ...store.pathIndex }
    };
    
    // Create new path index entry if it doesn't exist
    if (!newStore.pathIndex[newPathKey]) {
        newStore.pathIndex[newPathKey] = [];
    }
    
    // Update each message
    for (const messageId of messageIdsToUpdate) {
        // Update the message's targetPath
        newStore.messages[messageId] = {
            ...newStore.messages[messageId],
            targetPath: newPath
        };
        
        // Add to new path index
        newStore.pathIndex[newPathKey].push(messageId);
    }
    
    // Remove old path index
    delete newStore.pathIndex[oldPathKey];
    
    return newStore;
}

// Helper function to generate a unique ID
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
} 