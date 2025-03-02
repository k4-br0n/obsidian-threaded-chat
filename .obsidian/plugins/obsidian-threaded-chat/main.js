var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/main.ts
__export(exports, {
  default: () => ThreadedChatPlugin
});
var import_obsidian2 = __toModule(require("obsidian"));

// src/models/ChatModel.ts
var createEmptyChatStore = () => ({
  messages: {},
  pathIndex: {}
});
function addMessage(store, message) {
  const newStore = {
    messages: __spreadValues({}, store.messages),
    pathIndex: __spreadValues({}, store.pathIndex)
  };
  newStore.messages[message.id] = message;
  const pathKey = `${message.targetPath.type}:${message.targetPath.path}`;
  if (!newStore.pathIndex[pathKey]) {
    newStore.pathIndex[pathKey] = [];
  }
  newStore.pathIndex[pathKey].push(message.id);
  return newStore;
}
function getMessagesForPath(store, path) {
  const pathKey = `${path.type}:${path.path}`;
  const messageIds = store.pathIndex[pathKey] || [];
  return messageIds.map((id) => store.messages[id]).filter((msg) => !!msg);
}
function getThread(store, rootMessageId) {
  const rootMessage = store.messages[rootMessageId];
  if (!rootMessage)
    return null;
  const replies = Object.values(store.messages).filter((msg) => msg.parentId === rootMessageId).sort((a, b) => a.timestamp - b.timestamp);
  const subThreads = {};
  for (const reply of replies) {
    const subThread = getThread(store, reply.id);
    if (subThread && subThread.replies.length > 0) {
      subThreads[reply.id] = subThread;
    }
  }
  return {
    rootMessage,
    replies,
    subThreads: Object.keys(subThreads).length > 0 ? subThreads : void 0
  };
}
function getThreadsForPath(store, path) {
  const messages = getMessagesForPath(store, path);
  const rootMessages = messages.filter((msg) => !msg.parentId);
  return rootMessages.map((rootMsg) => getThread(store, rootMsg.id)).filter((thread) => thread !== null).sort((a, b) => a.rootMessage.timestamp - b.rootMessage.timestamp);
}
function getChildThreads(store, folderPath) {
  if (!folderPath.endsWith("/")) {
    folderPath = folderPath + "/";
  }
  const childPaths = [];
  for (const pathKey of Object.keys(store.pathIndex)) {
    const [type, path] = pathKey.split(":");
    if (!path.startsWith(folderPath))
      continue;
    if (path === folderPath.slice(0, -1))
      continue;
    const relativePath = path.slice(folderPath.length);
    if (!relativePath.includes("/")) {
      childPaths.push({
        path,
        type
      });
    }
  }
  return childPaths.map((path) => ({
    path,
    threads: getThreadsForPath(store, path)
  }));
}
function updateMessagePath(store, oldPath, newPath) {
  const oldPathKey = `${oldPath.type}:${oldPath.path}`;
  const newPathKey = `${newPath.type}:${newPath.path}`;
  if (!store.pathIndex[oldPathKey])
    return store;
  const messageIdsToUpdate = [...store.pathIndex[oldPathKey]];
  const newStore = {
    messages: __spreadValues({}, store.messages),
    pathIndex: __spreadValues({}, store.pathIndex)
  };
  if (!newStore.pathIndex[newPathKey]) {
    newStore.pathIndex[newPathKey] = [];
  }
  for (const messageId of messageIdsToUpdate) {
    newStore.messages[messageId] = __spreadProps(__spreadValues({}, newStore.messages[messageId]), {
      targetPath: newPath
    });
    newStore.pathIndex[newPathKey].push(messageId);
  }
  delete newStore.pathIndex[oldPathKey];
  return newStore;
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// src/services/StorageService.ts
var PLUGIN_DATA_FILENAME = ".obsidian/plugins/obsidian-threaded-chat/chat-data.json";
var VAULT_DATA_FILENAME = ".chat-data.json";
var StorageService = class {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
  }
  updateSettings(newSettings) {
    this.settings = newSettings;
  }
  getDataFilename() {
    return this.settings.storageLocation === "vault" ? VAULT_DATA_FILENAME : PLUGIN_DATA_FILENAME;
  }
  saveChatStore(store) {
    return __async(this, null, function* () {
      try {
        const serializedData = JSON.stringify(store, null, 2);
        const filename = this.getDataFilename();
        yield this.app.vault.adapter.write(filename, serializedData);
      } catch (error) {
        console.error("Failed to save chat store:", error);
        throw error;
      }
    });
  }
  loadChatStore() {
    return __async(this, null, function* () {
      try {
        const filename = this.getDataFilename();
        const exists = yield this.app.vault.adapter.exists(filename);
        if (!exists) {
          const altFilename = filename === PLUGIN_DATA_FILENAME ? VAULT_DATA_FILENAME : PLUGIN_DATA_FILENAME;
          const altExists = yield this.app.vault.adapter.exists(altFilename);
          if (altExists) {
            console.log(`Data found in alternate location: ${altFilename}`);
            const serializedData2 = yield this.app.vault.adapter.read(altFilename);
            return JSON.parse(serializedData2);
          }
          return createEmptyChatStore();
        }
        const serializedData = yield this.app.vault.adapter.read(filename);
        return JSON.parse(serializedData);
      } catch (error) {
        console.error("Failed to load chat store:", error);
        return createEmptyChatStore();
      }
    });
  }
};

// src/ui/ThreadedChatView.ts
var import_obsidian = __toModule(require("obsidian"));
var VIEW_TYPE_THREADED_CHAT = "threaded-chat-view";
var ThreadedChatView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.currentPath = null;
    this.showChildThreads = true;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_THREADED_CHAT;
  }
  getDisplayText() {
    return "Threaded Chat";
  }
  onOpen() {
    return __async(this, null, function* () {
      const { containerEl } = this;
      containerEl.empty();
      const headerContainer = containerEl.createDiv({ cls: "threaded-chat-header" });
      headerContainer.createEl("h3", { text: "Threaded Chat" });
      const toggleContainer = headerContainer.createDiv({ cls: "threaded-chat-toggle" });
      const toggle = toggleContainer.createEl("input", { type: "checkbox" });
      toggle.checked = this.showChildThreads;
      toggleContainer.createSpan({ text: "Show Child Threads" });
      toggle.addEventListener("change", (e) => {
        this.showChildThreads = toggle.checked;
        this.renderMessages();
      });
      this.renderBreadcrumbs(headerContainer);
      this.chatContainer = containerEl.createDiv({ cls: "threaded-chat-messages" });
      this.inputContainer = containerEl.createDiv({ cls: "threaded-chat-input" });
      const textInput = this.inputContainer.createEl("textarea", {
        placeholder: "Type your message here..."
      });
      const buttonContainer = this.inputContainer.createDiv({ cls: "threaded-chat-buttons" });
      const sendButton = buttonContainer.createEl("button", { text: "Send" });
      sendButton.addEventListener("click", () => {
        const content = textInput.value.trim();
        if (content && this.currentPath) {
          this.sendMessage(content);
          textInput.value = "";
        }
      });
      textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const content = textInput.value.trim();
          if (content && this.currentPath) {
            this.sendMessage(content);
            textInput.value = "";
          }
        }
      });
      this.registerEvent(this.app.workspace.on("file-open", (file) => {
        if (file) {
          this.updateForFile(file);
        }
      }));
      this.registerDomEvent(document, "click", (evt) => {
        const target = evt.target;
        const fileExplorer = target.closest(".nav-folder-title");
        if (fileExplorer) {
          const folderTitle = fileExplorer.querySelector(".nav-folder-title-content");
          if (folderTitle) {
            const folderName = folderTitle.textContent;
            const folder = this.findFolderByName(folderName || "");
            if (folder) {
              this.updateForFolder(folder);
            }
          }
        }
      });
      const currentFile = this.app.workspace.getActiveFile();
      if (currentFile) {
        this.updateForFile(currentFile);
      }
    });
  }
  findFolderByName(name) {
    const folders = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof import_obsidian.TFolder);
    return folders.find((f) => f.name === name) || null;
  }
  onClose() {
    return __async(this, null, function* () {
    });
  }
  renderBreadcrumbs(container) {
    if (!this.currentPath)
      return;
    const breadcrumbsEl = container.createDiv({ cls: "threaded-chat-breadcrumbs" });
    const parts = this.currentPath.path.split("/");
    let currentPath = "";
    const rootEl = breadcrumbsEl.createSpan({ text: "Root", cls: "breadcrumb-item" });
    rootEl.addEventListener("click", () => {
      const rootFolder = this.app.vault.getRoot();
      this.updateForFolder(rootFolder);
    });
    breadcrumbsEl.createSpan({ text: ">", cls: "breadcrumb-separator" });
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part)
        continue;
      currentPath += (currentPath ? "/" : "") + part;
      const partEl = breadcrumbsEl.createSpan({
        text: part,
        cls: "breadcrumb-item"
      });
      if (i < parts.length - 1) {
        partEl.addClass("clickable");
        const pathForClick = currentPath;
        partEl.addEventListener("click", () => {
          const folder = this.app.vault.getAbstractFileByPath(pathForClick);
          if (folder instanceof import_obsidian.TFolder) {
            this.updateForFolder(folder);
          }
        });
        breadcrumbsEl.createSpan({ text: ">", cls: "breadcrumb-separator" });
      }
    }
  }
  updateForFile(file) {
    this.currentPath = {
      path: file.path,
      type: "file"
    };
    const headerEl = this.containerEl.querySelector(".threaded-chat-header");
    if (headerEl) {
      headerEl.empty();
      this.renderBreadcrumbs(headerEl);
    }
    this.updateHeader();
    this.renderMessages();
  }
  updateForFolder(folder) {
    this.currentPath = {
      path: folder.path,
      type: "folder"
    };
    const headerEl = this.containerEl.querySelector(".threaded-chat-header");
    if (headerEl) {
      headerEl.empty();
      this.renderBreadcrumbs(headerEl);
    }
    this.updateHeader();
    this.renderMessages();
  }
  updateHeader() {
    if (!this.currentPath)
      return;
    const headerEl = this.containerEl.querySelector("h3");
    if (headerEl) {
      const pathParts = this.currentPath.path.split("/");
      const name = pathParts[pathParts.length - 1] || "Root";
      headerEl.setText(`Chat: ${name}`);
    }
  }
  renderMessages() {
    if (!this.currentPath || !this.chatContainer)
      return;
    this.chatContainer.empty();
    const threads = getThreadsForPath(this.plugin.getChatStore(), this.currentPath);
    threads.forEach((thread) => {
      this.renderThreadElement(thread, this.chatContainer, 0);
    });
    if (this.currentPath.type === "folder" && this.showChildThreads) {
      this.renderChildThreads();
    }
  }
  renderChildThreads() {
    if (!this.currentPath)
      return;
    const folderPath = this.currentPath.path;
    const childThreads = getChildThreads(this.plugin.getChatStore(), folderPath);
    if (childThreads.length === 0)
      return;
    this.chatContainer.createEl("hr");
    const folders = childThreads.filter((item) => item.path.type === "folder");
    const files = childThreads.filter((item) => item.path.type === "file");
    if (folders.length > 0) {
      const foldersContainer = this.chatContainer.createDiv({ cls: "child-folders-container" });
      foldersContainer.createEl("h4", { text: "Subfolders" });
      folders.forEach((folderItem) => {
        this.renderChildItem(folderItem, foldersContainer);
      });
    }
    if (files.length > 0) {
      const filesContainer = this.chatContainer.createDiv({ cls: "child-files-container" });
      filesContainer.createEl("h4", { text: "Files" });
      files.forEach((fileItem) => {
        this.renderChildItem(fileItem, filesContainer);
      });
    }
  }
  renderChildItem(item, container) {
    const itemContainer = container.createDiv({ cls: "child-item-container" });
    const pathParts = item.path.path.split("/");
    const name = pathParts[pathParts.length - 1];
    const headerEl = itemContainer.createDiv({
      cls: "child-item-header clickable"
    });
    const iconEl = headerEl.createSpan({
      cls: `child-item-icon ${item.path.type === "folder" ? "folder-icon" : "file-icon"}`
    });
    headerEl.createSpan({ text: name, cls: "child-item-name" });
    headerEl.createSpan({
      text: `${item.threads.length} thread${item.threads.length !== 1 ? "s" : ""}`,
      cls: "child-item-thread-count"
    });
    headerEl.addEventListener("click", () => {
      const file = this.app.vault.getAbstractFileByPath(item.path.path);
      if (file instanceof import_obsidian.TFile) {
        this.updateForFile(file);
      } else if (file instanceof import_obsidian.TFolder) {
        this.updateForFolder(file);
      }
    });
    if (item.threads.length > 0) {
      const previewContainer = itemContainer.createDiv({ cls: "thread-preview-container" });
      const preview = item.threads[0].rootMessage;
      const previewEl = previewContainer.createDiv({ cls: "thread-preview" });
      previewEl.createDiv({ text: preview.content.slice(0, 100) + (preview.content.length > 100 ? "..." : "") });
      previewEl.addEventListener("click", () => {
        const file = this.app.vault.getAbstractFileByPath(item.path.path);
        if (file instanceof import_obsidian.TFile) {
          this.updateForFile(file);
        } else if (file instanceof import_obsidian.TFolder) {
          this.updateForFolder(file);
        }
      });
    }
  }
  renderThreadElement(thread, container, depth) {
    const threadContainer = container.createDiv({ cls: "threaded-chat-thread" });
    threadContainer.style.marginLeft = `${depth * 20}px`;
    this.renderMessage(thread.rootMessage, threadContainer);
    if (thread.replies && thread.replies.length > 0) {
      const repliesContainer = threadContainer.createDiv({ cls: "threaded-chat-replies" });
      thread.replies.forEach((reply) => {
        this.renderMessage(reply, repliesContainer);
        if (thread.subThreads && thread.subThreads[reply.id]) {
          this.renderThreadElement(thread.subThreads[reply.id], repliesContainer, depth + 1);
        }
      });
    }
  }
  renderMessage(message, container) {
    const messageEl = container.createDiv({ cls: "threaded-chat-message" });
    const headerEl = messageEl.createDiv({ cls: "threaded-chat-message-header" });
    headerEl.createSpan({ text: message.authorName, cls: "threaded-chat-author" });
    const timestampStr = new Date(message.timestamp).toLocaleString();
    headerEl.createSpan({ text: timestampStr, cls: "threaded-chat-timestamp" });
    const contentEl = messageEl.createDiv({ cls: "threaded-chat-message-content" });
    contentEl.createDiv({ text: message.content });
    const actionsEl = messageEl.createDiv({ cls: "threaded-chat-message-actions" });
    const replyButton = actionsEl.createEl("button", { text: "Reply" });
    replyButton.addEventListener("click", () => {
      this.setupReplyInput(message);
    });
    const reactButton = actionsEl.createEl("button", { text: "\u{1F600}" });
    reactButton.addEventListener("click", () => {
      this.addReaction(message.id, "\u{1F44D}");
    });
    if (message.reactions && Object.keys(message.reactions).length > 0) {
      const reactionsEl = messageEl.createDiv({ cls: "threaded-chat-reactions" });
      for (const [emoji, users] of Object.entries(message.reactions)) {
        const reactionEl = reactionsEl.createSpan({
          cls: "reaction-pill",
          text: `${emoji} ${users.length}`
        });
        reactionEl.addEventListener("click", () => {
          this.addReaction(message.id, emoji);
        });
      }
    }
    if (message.targetPath.type === "file" || message.targetPath.type === "folder") {
      const contextEl = messageEl.createDiv({ cls: "message-context" });
      const pathParts = message.targetPath.path.split("/");
      const name = pathParts[pathParts.length - 1];
      contextEl.createSpan({
        text: `in ${message.targetPath.type}: ${name}`,
        cls: "context-info"
      });
      contextEl.addEventListener("click", () => {
        const target = this.app.vault.getAbstractFileByPath(message.targetPath.path);
        if (target instanceof import_obsidian.TFile) {
          this.updateForFile(target);
        } else if (target instanceof import_obsidian.TFolder) {
          this.updateForFolder(target);
        }
      });
    }
  }
  addReaction(messageId, emoji) {
    const store = this.plugin.getChatStore();
    const message = store.messages[messageId];
    if (!message)
      return;
    const updatedMessage = __spreadValues({}, message);
    if (!updatedMessage.reactions) {
      updatedMessage.reactions = {};
    }
    if (!updatedMessage.reactions[emoji]) {
      updatedMessage.reactions[emoji] = [];
    }
    const userId = "user-1";
    const userIndex = updatedMessage.reactions[emoji].indexOf(userId);
    if (userIndex >= 0) {
      updatedMessage.reactions[emoji].splice(userIndex, 1);
      if (updatedMessage.reactions[emoji].length === 0) {
        delete updatedMessage.reactions[emoji];
      }
      if (Object.keys(updatedMessage.reactions).length === 0) {
        delete updatedMessage.reactions;
      }
    } else {
      updatedMessage.reactions[emoji].push(userId);
    }
    const newStore = __spreadValues({}, store);
    newStore.messages = __spreadValues({}, store.messages);
    newStore.messages[messageId] = updatedMessage;
    this.plugin.updateChatStore(newStore);
    this.renderMessages();
  }
  setupReplyInput(parentMessage) {
    const existingReplyTo = this.inputContainer.querySelector(".replying-to");
    if (existingReplyTo) {
      existingReplyTo.remove();
    }
    const replyingToEl = this.inputContainer.createDiv({
      cls: "replying-to"
    });
    replyingToEl.createSpan({
      text: `Replying to: ${parentMessage.content.substring(0, 50)}${parentMessage.content.length > 50 ? "..." : ""}`,
      cls: "reply-text"
    });
    const cancelReply = replyingToEl.createEl("button", { text: "Cancel" });
    cancelReply.addEventListener("click", () => {
      replyingToEl.remove();
      this.inputContainer.dataset.replyingTo = "";
    });
    this.inputContainer.dataset.replyingTo = parentMessage.id;
  }
  sendMessage(content) {
    if (!this.currentPath)
      return;
    const message = {
      id: generateId(),
      content,
      timestamp: Date.now(),
      authorName: "User",
      authorId: "user-1",
      targetPath: this.currentPath
    };
    const parentId = this.inputContainer.dataset.replyingTo;
    if (parentId) {
      message.parentId = parentId;
      const replyingToEl = this.inputContainer.querySelector(".replying-to");
      if (replyingToEl) {
        replyingToEl.remove();
      }
      this.inputContainer.dataset.replyingTo = "";
    }
    const newStore = addMessage(this.plugin.getChatStore(), message);
    this.plugin.updateChatStore(newStore);
    this.renderMessages();
  }
  toggleChildThreads() {
    this.showChildThreads = !this.showChildThreads;
    this.renderMessages();
  }
  replyToLastMessage() {
    if (!this.currentPath)
      return;
    const messages = getMessagesForPath(this.plugin.getChatStore(), this.currentPath);
    if (messages.length > 0) {
      const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);
      this.setupReplyInput(sortedMessages[0]);
    }
  }
  updateSettings(settings) {
    this.showChildThreads = settings.defaultShowChildThreads;
    this.renderMessages();
  }
  refreshView() {
    if (this.currentPath) {
      const file = this.app.vault.getAbstractFileByPath(this.currentPath.path);
      if (file) {
        if (file instanceof import_obsidian.TFile) {
          this.updateForFile(file);
        } else if (file instanceof import_obsidian.TFolder) {
          this.updateForFolder(file);
        }
      }
    }
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  userName: "User",
  userId: "user-1",
  autoShowChat: true,
  storageLocation: "plugin",
  hideEmptyChats: false,
  defaultShowChildThreads: true
};
var ThreadedChatPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.activeView = null;
  }
  onload() {
    return __async(this, null, function* () {
      console.log("Loading Threaded Chat plugin");
      yield this.loadSettings();
      this.storageService = new StorageService(this.app, this.settings);
      this.chatStore = yield this.storageService.loadChatStore();
      this.registerView(VIEW_TYPE_THREADED_CHAT, (leaf) => {
        this.activeView = new ThreadedChatView(leaf, this);
        return this.activeView;
      });
      this.addRibbonIcon("message-square", "Open Threaded Chat", () => {
        this.activateView();
      });
      this.addCommand({
        id: "open-threaded-chat",
        name: "Open Threaded Chat",
        callback: () => {
          this.activateView();
        }
      });
      this.addCommand({
        id: "toggle-child-threads",
        name: "Toggle Child Threads Visibility",
        callback: () => {
          if (this.activeView) {
            this.activeView.toggleChildThreads();
          }
        }
      });
      this.addCommand({
        id: "reply-to-last-message",
        name: "Reply to Last Message",
        callback: () => {
          if (this.activeView) {
            this.activeView.replyToLastMessage();
          }
        }
      });
      this.registerFileEvents();
      if (this.settings.autoShowChat) {
        this.app.workspace.onLayoutReady(() => {
          this.activateView();
        });
      }
      this.addSettingTab(new ThreadedChatSettingTab(this.app, this));
    });
  }
  onunload() {
    return __async(this, null, function* () {
      console.log("Unloading Threaded Chat plugin");
      yield this.storageService.saveChatStore(this.chatStore);
    });
  }
  loadSettings() {
    return __async(this, null, function* () {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
    });
  }
  saveSettings() {
    return __async(this, null, function* () {
      yield this.saveData(this.settings);
      if (this.storageService) {
        this.storageService.updateSettings(this.settings);
      }
      if (this.activeView) {
        this.activeView.updateSettings(this.settings);
      }
    });
  }
  getChatStore() {
    return this.chatStore;
  }
  updateChatStore(newStore) {
    this.chatStore = newStore;
    this.storageService.saveChatStore(newStore);
  }
  activateView() {
    return __async(this, null, function* () {
      const { workspace } = this.app;
      let leaf = workspace.getLeavesOfType(VIEW_TYPE_THREADED_CHAT)[0];
      if (!leaf) {
        const rightSideLeaf = workspace.getRightLeaf(false);
        if (rightSideLeaf) {
          leaf = rightSideLeaf;
          yield leaf.setViewState({
            type: VIEW_TYPE_THREADED_CHAT,
            active: true
          });
        } else {
          console.error("Could not create leaf for threaded chat view");
          return;
        }
      }
      workspace.revealLeaf(leaf);
      const view = leaf.view;
      if (view instanceof ThreadedChatView) {
        this.activeView = view;
      }
    });
  }
  registerFileEvents() {
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      const newPath = {
        path: file.path,
        type: file instanceof import_obsidian2.TFolder ? "folder" : "file"
      };
      const oldObsidianPath = {
        path: oldPath,
        type: file instanceof import_obsidian2.TFolder ? "folder" : "file"
      };
      if (file instanceof import_obsidian2.TFolder) {
        new import_obsidian2.Notice(`Updating chat references for renamed folder: ${oldPath} \u2192 ${file.path}`);
      }
      const updatedStore = updateMessagePath(this.chatStore, oldObsidianPath, newPath);
      this.updateChatStore(updatedStore);
      if (this.activeView) {
        this.activeView.refreshView();
      }
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      new import_obsidian2.Notice(`Note: Chat messages for deleted ${file instanceof import_obsidian2.TFolder ? "folder" : "file"} "${file.path}" are preserved`);
    }));
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      if (file && this.settings.autoShowChat) {
        this.activateView();
      }
    }));
  }
};
var ThreadedChatSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Threaded Chat Settings" });
    new import_obsidian2.Setting(containerEl).setName("User Name").setDesc("Your display name in chats").addText((text) => text.setPlaceholder("User").setValue(this.plugin.settings.userName).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.userName = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian2.Setting(containerEl).setName("User ID").setDesc("Your unique ID for reactions and mentions (no spaces)").addText((text) => text.setPlaceholder("user-1").setValue(this.plugin.settings.userId).onChange((value) => __async(this, null, function* () {
      const sanitized = value.replace(/[^a-zA-Z0-9-_]/g, "");
      this.plugin.settings.userId = sanitized;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian2.Setting(containerEl).setName("Auto-show Chat").setDesc("Automatically open chat view when opening a file").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoShowChat).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.autoShowChat = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian2.Setting(containerEl).setName("Show Child Threads").setDesc("Show threads from child folders and files by default").addToggle((toggle) => toggle.setValue(this.plugin.settings.defaultShowChildThreads).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.defaultShowChildThreads = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian2.Setting(containerEl).setName("Hide Empty Chats").setDesc("Hide folders and files with no messages").addToggle((toggle) => toggle.setValue(this.plugin.settings.hideEmptyChats).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.hideEmptyChats = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian2.Setting(containerEl).setName("Storage Location").setDesc("Where to store chat data").addDropdown((dropdown) => dropdown.addOption("plugin", "Plugin folder").addOption("vault", "Vault root").setValue(this.plugin.settings.storageLocation).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.storageLocation = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian2.Setting(containerEl).setName("Export Chat Data").setDesc("Export all chat data to a JSON file").addButton((button) => button.setButtonText("Export").onClick(() => __async(this, null, function* () {
      const jsonData = JSON.stringify(this.plugin.getChatStore(), null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `obsidian-threaded-chat-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      new import_obsidian2.Notice("Chat data exported successfully");
    })));
  }
};
