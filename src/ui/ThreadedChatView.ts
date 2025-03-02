import { ItemView, WorkspaceLeaf, TFile, TFolder, TAbstractFile } from 'obsidian';
import ThreadedChatPlugin from '../main';
import { ChatMessage, ObsidianPath, addMessage, generateId, getMessagesForPath } from '../models/ChatModel';

export const VIEW_TYPE_THREADED_CHAT = 'threaded-chat-view';

export class ThreadedChatView extends ItemView {
    private plugin: ThreadedChatPlugin;
    private contentEl: HTMLElement;
    private currentPath: ObsidianPath | null = null;
    private chatContainer: HTMLElement;
    private inputContainer: HTMLElement;
    
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
        containerEl.createEl('h3', { text: 'Threaded Chat' });
        
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
        
        // Register for active folder changes (when folder is selected in explorer)
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                const explorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
                if (explorer && explorer.view) {
                    // This is a bit hacky as there's no direct API to get selected folder
                    // We'd need to observe DOM changes in a real implementation
                    // For now we'll stick with files
                }
            })
        );
        
        // Initial load - get current file
        const currentFile = this.app.workspace.getActiveFile();
        if (currentFile) {
            this.updateForFile(currentFile);
        }
    }
    
    async onClose() {
        // Clean up event listeners
    }
    
    // Update view when switching to a different file
    private updateForFile(file: TFile) {
        this.currentPath = {
            path: file.path,
            type: 'file'
        };
        
        this.updateHeader();
        this.renderMessages();
    }
    
    // Update for folder
    private updateForFolder(folder: TFolder) {
        this.currentPath = {
            path: folder.path,
            type: 'folder'
        };
        
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
            const name = pathParts[pathParts.length - 1];
            headerEl.setText(`Chat: ${name}`);
        }
    }
    
    // Render messages for current path
    private renderMessages() {
        if (!this.currentPath || !this.chatContainer) return;
        
        // Clear existing messages
        this.chatContainer.empty();
        
        // Get messages for this path
        const messages = getMessagesForPath(this.plugin.getChatStore(), this.currentPath);
        
        // Sort by timestamp
        const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
        
        // Group into threads
        const threads: Record<string, ChatMessage[]> = {};
        const rootMessages: ChatMessage[] = [];
        
        sortedMessages.forEach(message => {
            if (!message.parentId) {
                // This is a root message
                rootMessages.push(message);
                threads[message.id] = [message];
            } else {
                // This is a reply
                if (!threads[message.parentId]) {
                    threads[message.parentId] = [];
                }
                threads[message.parentId].push(message);
            }
        });
        
        // Render each thread
        rootMessages.forEach(rootMessage => {
            this.renderThread(rootMessage, threads[rootMessage.id], this.chatContainer, 0);
        });
    }
    
    // Render a thread of messages
    private renderThread(rootMessage: ChatMessage, messages: ChatMessage[], container: HTMLElement, depth: number) {
        const threadContainer = container.createDiv({ cls: 'threaded-chat-thread' });
        threadContainer.style.marginLeft = `${depth * 20}px`;
        
        // Render the root message
        this.renderMessage(rootMessage, threadContainer);
        
        // Render replies, skip the root message which is already rendered
        const replies = messages.filter(m => m.id !== rootMessage.id);
        
        if (replies.length > 0) {
            const repliesContainer = threadContainer.createDiv({ cls: 'threaded-chat-replies' });
            
            replies.forEach(reply => {
                this.renderMessage(reply, repliesContainer);
                
                // Recursively render any nested threads
                if (threads[reply.id] && threads[reply.id].length > 1) {
                    this.renderThread(reply, threads[reply.id], repliesContainer, depth + 1);
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
            cls: 'replying-to', 
            text: `Replying to: ${parentMessage.content.substring(0, 30)}...` 
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
} 