import { ItemView, WorkspaceLeaf, TFile, TFolder, TAbstractFile } from 'obsidian';
import ThreadedChatPlugin from '../main';
import { 
    ChatMessage, 
    ChatThread, 
    ObsidianPath, 
    addMessage, 
    generateId, 
    getMessagesForPath, 
    getThreadsForPath,
    getChildThreads
} from '../models/ChatModel';

export const VIEW_TYPE_THREADED_CHAT = 'threaded-chat-view';

export class ThreadedChatView extends ItemView {
    private plugin: ThreadedChatPlugin;
    contentEl: HTMLElement;
    private currentPath: ObsidianPath | null = null;
    private chatContainer: HTMLElement;
    private inputContainer: HTMLElement;
    private showChildThreads: boolean = true; // Whether to show child threads
    
    constructor(leaf: WorkspaceLeaf, plugin: ThreadedChatPlugin) {
        super(leaf);
        this.plugin = plugin;
    }
    
    getViewType(): string {
        return VIEW_TYPE_THREADED_CHAT;
    }
    
    getDisplayText(): string {
        return 'Threaded Chat';
    }
    
    async onOpen() {
        const { containerEl } = this;
        containerEl.empty();
        
        // Main container
        const headerContainer = containerEl.createDiv({ cls: 'threaded-chat-header' });
        headerContainer.createEl('h3', { text: 'Threaded Chat' });
        
        // Toggle for child threads
        const toggleContainer = headerContainer.createDiv({ cls: 'threaded-chat-toggle' });
        const toggle = toggleContainer.createEl('input', { type: 'checkbox' });
        toggle.checked = this.showChildThreads;
        toggleContainer.createSpan({ text: 'Show Child Threads' });
        
        toggle.addEventListener('change', (e) => {
            this.showChildThreads = toggle.checked;
            this.renderMessages();
        });
        
        // Create breadcrumbs for navigation
        this.renderBreadcrumbs(headerContainer);
        
        // Create chat display area
        this.chatContainer = containerEl.createDiv({ cls: 'threaded-chat-messages' });
        
        // Create input area
        this.inputContainer = containerEl.createDiv({ cls: 'threaded-chat-input' });
        
        const textInput = this.inputContainer.createEl('textarea', { 
            placeholder: 'Type your message here...'
        });
        
        const buttonContainer = this.inputContainer.createDiv({ cls: 'threaded-chat-buttons' });
        
        const sendButton = buttonContainer.createEl('button', { text: 'Send' });
        sendButton.addEventListener('click', () => {
            const content = textInput.value.trim();
            if (content && this.currentPath) {
                this.sendMessage(content);
                textInput.value = '';
            }
        });
        
        // Handle Enter key for sending
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const content = textInput.value.trim();
                if (content && this.currentPath) {
                    this.sendMessage(content);
                    textInput.value = '';
                }
            }
        });
        
        // Listen for active file changes
        this.registerEvent(
            this.app.workspace.on('file-open', (file: TFile | null) => {
                if (file) {
                    this.updateForFile(file);
                }
            })
        );
        
        // Register for file explorer click events to handle folder selection
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            const target = evt.target as HTMLElement;
            const fileExplorer = target.closest('.nav-folder-title');
            
            if (fileExplorer) {
                // Try to extract folder path from data attributes or text content
                // This is a bit hacky and may need adjustment based on Obsidian's DOM structure
                const folderTitle = fileExplorer.querySelector('.nav-folder-title-content');
                if (folderTitle) {
                    const folderName = folderTitle.textContent;
                    const folder = this.findFolderByName(folderName || '');
                    if (folder) {
                        this.updateForFolder(folder);
                    }
                }
            }
        });
        
        // Initial load - get current file
        const currentFile = this.app.workspace.getActiveFile();
        if (currentFile) {
            this.updateForFile(currentFile);
        }
    }
    
    // Helper to find a folder by name
    private findFolderByName(name: string): TFolder | null {
        const folders = this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder) as TFolder[];
        return folders.find(f => f.name === name) || null;
    }
    
    async onClose() {
        // Clean up event listeners
    }
    
    // Render breadcrumbs for navigation
    private renderBreadcrumbs(container: HTMLElement) {
        if (!this.currentPath) return;
        
        const breadcrumbsEl = container.createDiv({ cls: 'threaded-chat-breadcrumbs' });
        
        // Split path into parts
        const parts = this.currentPath.path.split('/');
        let currentPath = '';
        
        // Add root
        const rootEl = breadcrumbsEl.createSpan({ text: 'Root', cls: 'breadcrumb-item' });
        rootEl.addEventListener('click', () => {
            // Go to vault root
            const rootFolder = this.app.vault.getRoot();
            this.updateForFolder(rootFolder);
        });
        
        // Add separator
        breadcrumbsEl.createSpan({ text: '>', cls: 'breadcrumb-separator' });
        
        // Add each path part
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!part) continue;
            
            currentPath += (currentPath ? '/' : '') + part;
            
            const partEl = breadcrumbsEl.createSpan({ 
                text: part, 
                cls: 'breadcrumb-item' 
            });
            
            // Make it clickable if not the last item
            if (i < parts.length - 1) {
                partEl.addClass('clickable');
                
                // Create a closure to capture the current path
                const pathForClick = currentPath;
                partEl.addEventListener('click', () => {
                    const folder = this.app.vault.getAbstractFileByPath(pathForClick);
                    if (folder instanceof TFolder) {
                        this.updateForFolder(folder);
                    }
                });
                
                // Add separator
                breadcrumbsEl.createSpan({ text: '>', cls: 'breadcrumb-separator' });
            }
        }
    }
    
    // Update view when switching to a different file
    private updateForFile(file: TFile) {
        this.currentPath = {
            path: file.path,
            type: 'file'
        };
        
        const headerEl = this.containerEl.querySelector('.threaded-chat-header') as HTMLElement;
        if (headerEl) {
            headerEl.empty();
            this.renderBreadcrumbs(headerEl);
        }
        this.updateHeader();
        this.renderMessages();
    }
    
    // Update for folder
    private updateForFolder(folder: TFolder) {
        this.currentPath = {
            path: folder.path,
            type: 'folder'
        };
        
        const headerEl = this.containerEl.querySelector('.threaded-chat-header') as HTMLElement;
        if (headerEl) {
            headerEl.empty();
            this.renderBreadcrumbs(headerEl);
        }
        this.updateHeader();
        this.renderMessages();
    }
    
    // Update the header to show current context
    private updateHeader() {
        if (!this.currentPath) return;
        
        const headerEl = this.containerEl.querySelector('h3');
        if (headerEl) {
            // Show path in header
            const pathParts = this.currentPath.path.split('/');
            const name = pathParts[pathParts.length - 1] || 'Root';
            headerEl.setText(`Chat: ${name}`);
        }
    }
    
    // Render messages for current path
    private renderMessages() {
        if (!this.currentPath || !this.chatContainer) return;
        
        // Clear existing messages
        this.chatContainer.empty();
        
        // Get threads for this path
        const threads = getThreadsForPath(this.plugin.getChatStore(), this.currentPath);
        
        // Render each thread
        threads.forEach(thread => {
            this.renderThreadElement(thread, this.chatContainer, 0);
        });
        
        // If this is a folder and we want to show child threads
        if (this.currentPath.type === 'folder' && this.showChildThreads) {
            this.renderChildThreads();
        }
    }
    
    // Render child threads (from subfolders and files)
    private renderChildThreads() {
        if (!this.currentPath) return;
        
        const folderPath = this.currentPath.path;
        const childThreads = getChildThreads(this.plugin.getChatStore(), folderPath);
        
        if (childThreads.length === 0) return;
        
        // Add separator
        this.chatContainer.createEl('hr');
        
        // Group by type (folders first, then files)
        const folders = childThreads.filter(item => item.path.type === 'folder');
        const files = childThreads.filter(item => item.path.type === 'file');
        
        // Add folders
        if (folders.length > 0) {
            const foldersContainer = this.chatContainer.createDiv({ cls: 'child-folders-container' });
            foldersContainer.createEl('h4', { text: 'Subfolders' });
            
            folders.forEach(folderItem => {
                this.renderChildItem(folderItem, foldersContainer);
            });
        }
        
        // Add files
        if (files.length > 0) {
            const filesContainer = this.chatContainer.createDiv({ cls: 'child-files-container' });
            filesContainer.createEl('h4', { text: 'Files' });
            
            files.forEach(fileItem => {
                this.renderChildItem(fileItem, filesContainer);
            });
        }
    }
    
    // Render a child item (folder or file)
    private renderChildItem(item: {path: ObsidianPath, threads: ChatThread[]}, container: HTMLElement) {
        const itemContainer = container.createDiv({ cls: 'child-item-container' });
        
        // Extract name from path
        const pathParts = item.path.path.split('/');
        const name = pathParts[pathParts.length - 1];
        
        // Create clickable header
        const headerEl = itemContainer.createDiv({ 
            cls: 'child-item-header clickable' 
        });
        
        // Add icon based on type
        const iconEl = headerEl.createSpan({ 
            cls: `child-item-icon ${item.path.type === 'folder' ? 'folder-icon' : 'file-icon'}` 
        });
        
        // Add name
        headerEl.createSpan({ text: name, cls: 'child-item-name' });
        
        // Add thread count
        headerEl.createSpan({ 
            text: `${item.threads.length} thread${item.threads.length !== 1 ? 's' : ''}`,
            cls: 'child-item-thread-count'
        });
        
        // Make clickable to navigate
        headerEl.addEventListener('click', () => {
            const file = this.app.vault.getAbstractFileByPath(item.path.path);
            if (file instanceof TFile) {
                this.updateForFile(file);
            } else if (file instanceof TFolder) {
                this.updateForFolder(file);
            }
        });
        
        // Preview first thread if available
        if (item.threads.length > 0) {
            const previewContainer = itemContainer.createDiv({ cls: 'thread-preview-container' });
            
            // Only show the root message of the first thread as preview
            const preview = item.threads[0].rootMessage;
            
            // Create preview element
            const previewEl = previewContainer.createDiv({ cls: 'thread-preview' });
            previewEl.createDiv({ text: preview.content.slice(0, 100) + (preview.content.length > 100 ? '...' : '') });
            
            // Make entire preview clickable
            previewEl.addEventListener('click', () => {
                const file = this.app.vault.getAbstractFileByPath(item.path.path);
                if (file instanceof TFile) {
                    this.updateForFile(file);
                } else if (file instanceof TFolder) {
                    this.updateForFolder(file);
                }
            });
        }
    }
    
    // Render a thread and its replies
    private renderThreadElement(thread: ChatThread, container: HTMLElement, depth: number) {
        const threadContainer = container.createDiv({ cls: 'threaded-chat-thread' });
        threadContainer.style.marginLeft = `${depth * 20}px`;
        
        // Render the root message
        this.renderMessage(thread.rootMessage, threadContainer);
        
        // Render replies
        if (thread.replies && thread.replies.length > 0) {
            const repliesContainer = threadContainer.createDiv({ cls: 'threaded-chat-replies' });
            
            thread.replies.forEach(reply => {
                this.renderMessage(reply, repliesContainer);
                
                // Recursively render any nested threads
                if (thread.subThreads && thread.subThreads[reply.id]) {
                    this.renderThreadElement(thread.subThreads[reply.id], repliesContainer, depth + 1);
                }
            });
        }
    }
    
    // Render a single message
    private renderMessage(message: ChatMessage, container: HTMLElement) {
        const messageEl = container.createDiv({ cls: 'threaded-chat-message' });
        
        const headerEl = messageEl.createDiv({ cls: 'threaded-chat-message-header' });
        headerEl.createSpan({ text: message.authorName, cls: 'threaded-chat-author' });
        
        const timestampStr = new Date(message.timestamp).toLocaleString();
        headerEl.createSpan({ text: timestampStr, cls: 'threaded-chat-timestamp' });
        
        const contentEl = messageEl.createDiv({ cls: 'threaded-chat-message-content' });
        contentEl.createDiv({ text: message.content });
        
        const actionsEl = messageEl.createDiv({ cls: 'threaded-chat-message-actions' });
        const replyButton = actionsEl.createEl('button', { text: 'Reply' });
        
        // Handle reply button click
        replyButton.addEventListener('click', () => {
            this.setupReplyInput(message);
        });
        
        // Add emoji reaction button
        const reactButton = actionsEl.createEl('button', { text: '😀' });
        reactButton.addEventListener('click', () => {
            // Future: Implement emoji picker
            this.addReaction(message.id, '👍');
        });
        
        // Render reactions if any
        if (message.reactions && Object.keys(message.reactions).length > 0) {
            const reactionsEl = messageEl.createDiv({ cls: 'threaded-chat-reactions' });
            
            for (const [emoji, users] of Object.entries(message.reactions)) {
                const reactionEl = reactionsEl.createSpan({ 
                    cls: 'reaction-pill',
                    text: `${emoji} ${users.length}`
                });
                
                // Click to toggle reaction
                reactionEl.addEventListener('click', () => {
                    this.addReaction(message.id, emoji);
                });
            }
        }
        
        // Add context info (where this message belongs)
        if (message.targetPath.type === 'file' || message.targetPath.type === 'folder') {
            const contextEl = messageEl.createDiv({ cls: 'message-context' });
            const pathParts = message.targetPath.path.split('/');
            const name = pathParts[pathParts.length - 1];
            
            contextEl.createSpan({ 
                text: `in ${message.targetPath.type}: ${name}`,
                cls: 'context-info'
            });
            
            // Make it clickable to navigate to that location
            contextEl.addEventListener('click', () => {
                const target = this.app.vault.getAbstractFileByPath(message.targetPath.path);
                if (target instanceof TFile) {
                    this.updateForFile(target);
                } else if (target instanceof TFolder) {
                    this.updateForFolder(target);
                }
            });
        }
    }
    
    // Add a reaction to a message
    private addReaction(messageId: string, emoji: string) {
        const store = this.plugin.getChatStore();
        const message = store.messages[messageId];
        
        if (!message) return;
        
        // Create a copy of the message
        const updatedMessage = { ...message };
        
        // Initialize reactions if not exists
        if (!updatedMessage.reactions) {
            updatedMessage.reactions = {};
        }
        
        // Initialize emoji entry if not exists
        if (!updatedMessage.reactions[emoji]) {
            updatedMessage.reactions[emoji] = [];
        }
        
        const userId = 'user-1'; // Would come from settings
        
        // Toggle the reaction
        const userIndex = updatedMessage.reactions[emoji].indexOf(userId);
        if (userIndex >= 0) {
            // Remove reaction
            updatedMessage.reactions[emoji].splice(userIndex, 1);
            
            // Remove emoji if no users left
            if (updatedMessage.reactions[emoji].length === 0) {
                delete updatedMessage.reactions[emoji];
            }
            
            // Remove reactions object if empty
            if (Object.keys(updatedMessage.reactions).length === 0) {
                delete updatedMessage.reactions;
            }
        } else {
            // Add reaction
            updatedMessage.reactions[emoji].push(userId);
        }
        
        // Update the store
        const newStore = { ...store };
        newStore.messages = { ...store.messages };
        newStore.messages[messageId] = updatedMessage;
        
        this.plugin.updateChatStore(newStore);
        
        // Refresh the view
        this.renderMessages();
    }
    
    // Set up input for replying to a message
    private setupReplyInput(parentMessage: ChatMessage) {
        // Clear existing reply UI if any
        const existingReplyTo = this.inputContainer.querySelector('.replying-to');
        if (existingReplyTo) {
            existingReplyTo.remove();
        }
        
        // Add "Replying to" indicator
        const replyingToEl = this.inputContainer.createDiv({ 
            cls: 'replying-to'
        });
        
        replyingToEl.createSpan({ 
            text: `Replying to: ${parentMessage.content.substring(0, 50)}${parentMessage.content.length > 50 ? '...' : ''}`,
            cls: 'reply-text'
        });
        
        const cancelReply = replyingToEl.createEl('button', { text: 'Cancel' });
        cancelReply.addEventListener('click', () => {
            replyingToEl.remove();
            this.inputContainer.dataset.replyingTo = '';
        });
        
        // Store the parent message id
        this.inputContainer.dataset.replyingTo = parentMessage.id;
    }
    
    // Send a new message
    private sendMessage(content: string) {
        if (!this.currentPath) return;
        
        // Create the message
        const message: ChatMessage = {
            id: generateId(),
            content,
            timestamp: Date.now(),
            authorName: 'User', // Would come from settings
            authorId: 'user-1', // Would come from settings
            targetPath: this.currentPath
        };
        
        // Check if this is a reply
        const parentId = this.inputContainer.dataset.replyingTo;
        if (parentId) {
            message.parentId = parentId;
            
            // Clear the reply UI
            const replyingToEl = this.inputContainer.querySelector('.replying-to');
            if (replyingToEl) {
                replyingToEl.remove();
            }
            this.inputContainer.dataset.replyingTo = '';
        }
        
        // Add to store
        const newStore = addMessage(this.plugin.getChatStore(), message);
        this.plugin.updateChatStore(newStore);
        
        // Refresh the view
        this.renderMessages();
    }
    
    // Toggle child threads visibility
    toggleChildThreads() {
        this.showChildThreads = !this.showChildThreads;
        this.renderMessages();
    }
    
    // Reply to the last message in the current conversation
    replyToLastMessage() {
        if (!this.currentPath) return;
        
        // Get messages for this path
        const messages = getMessagesForPath(this.plugin.getChatStore(), this.currentPath);
        
        // Sort by timestamp to find the most recent
        if (messages.length > 0) {
            const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);
            this.setupReplyInput(sortedMessages[0]);
        }
    }
    
    // Update settings
    updateSettings(settings: any) {
        // Update default show child threads
        this.showChildThreads = settings.defaultShowChildThreads;
        this.renderMessages();
    }
    
    // Refresh view (e.g., after file rename)
    refreshView() {
        // Re-render everything
        if (this.currentPath) {
            const file = this.app.vault.getAbstractFileByPath(this.currentPath.path);
            if (file) {
                if (file instanceof TFile) {
                    this.updateForFile(file);
                } else if (file instanceof TFolder) {
                    this.updateForFolder(file as TFolder);
                }
            }
        }
    }
} 