// DOM 元素
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const themeToggle = document.getElementById('themeToggle');
const clearButton = document.getElementById('clearButton');
const toggleSidebar = document.getElementById('toggleSidebar');
const sidebar = document.querySelector('.sidebar');
const conversationList = document.getElementById('conversationList');
const newChatButton = document.getElementById('newChatButton');

// 聊天历史记录
let messages = [];
let conversations = [];
let currentConversationId = null;

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 从本地存储加载对话历史
function loadConversations() {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
        conversations = JSON.parse(savedConversations);
        renderConversationList();
    }
}

// 保存对话到本地存储
function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
}

// 渲染对话列表
function renderConversationList() {
    conversationList.innerHTML = '';
    conversations.forEach(conv => {
        const convElement = document.createElement('div');
        convElement.className = `conversation-item ${conv.id === currentConversationId ? 'active' : ''}`;
        
        const title = document.createElement('span');
        title.className = 'conversation-title';
        title.textContent = conv.title || '新对话';
        
        const date = document.createElement('span');
        date.className = 'conversation-date';
        date.textContent = new Date(conv.createdAt).toLocaleDateString();
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-conversation';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteConversation(conv.id);
        };
        
        convElement.appendChild(title);
        convElement.appendChild(date);
        convElement.appendChild(deleteBtn);
        
        convElement.onclick = () => loadConversation(conv.id);
        conversationList.appendChild(convElement);
    });
}

// 创建新对话
function createNewConversation() {
    const newConversation = {
        id: generateId(),
        title: '新对话',
        messages: [],
        createdAt: Date.now()
    };
    
    conversations.push(newConversation);
    saveConversations();
    loadConversation(newConversation.id);
    renderConversationList();
}

// 加载对话
function loadConversation(conversationId) {
    currentConversationId = conversationId;
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
        messages = conversation.messages;
        chatContainer.innerHTML = '';
        messages.forEach(msg => {
            addMessage(msg.content, msg.role === 'user');
        });
        renderConversationList();
    }
}

// 删除对话
function deleteConversation(conversationId) {
    if (confirm('确定要删除这个对话吗？此操作不可恢复。')) {
        conversations = conversations.filter(c => c.id !== conversationId);
        if (currentConversationId === conversationId) {
            currentConversationId = null;
            messages = [];
            chatContainer.innerHTML = '';
            addMessage('你好！我是你的 AI 生活教练。我可以帮助你解决生活中的问题，提供建议和指导。请告诉我你最近遇到了什么困扰？');
        }
        saveConversations();
        renderConversationList();
    }
}

// 更新对话标题
function updateConversationTitle(content) {
    if (currentConversationId) {
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (conversation) {
            conversation.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
            saveConversations();
            renderConversationList();
        }
    }
}

// 保存当前对话
function saveCurrentConversation() {
    if (currentConversationId) {
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (conversation) {
            conversation.messages = messages;
            saveConversations();
        }
    }
}

// 自动调整文本框高度
function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
}

// 添加消息到聊天界面
function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 发送消息到服务器
async function sendMessage(content) {
    try {
        // 显示加载指示器
        loadingIndicator.classList.remove('hidden');
        
        // 添加用户消息到界面
        addMessage(content, true);
        
        // 添加用户消息到历史记录
        messages.push({ role: 'user', content });
        
        // 保存更新后的对话
        saveCurrentConversation();
        
        // 创建 AbortController 用于超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 增加到 60 秒超时
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            let errorMessage = '服务器错误';
            
            if (response.status === 504) {
                errorMessage = '请求超时，请尝试发送更短的消息，或稍后重试';
            } else if (errorData?.message) {
                errorMessage = errorData.message;
            }
            
            throw new Error(errorMessage);
        }

        let responseData;
        try {
            const textResponse = await response.text();
            
            try {
                responseData = JSON.parse(textResponse);
            } catch (parseError) {
                if (response.ok) {
                    // 如果响应是成功的但不是 JSON，直接使用文本作为回复
                    responseData = {
                        choices: [{
                            message: {
                                content: textResponse.slice(0, 500) // 限制响应长度
                            }
                        }]
                    };
                } else {
                    throw new Error(textResponse || '服务器返回了无效的数据格式');
                }
            }

            if (!responseData.choices?.[0]?.message?.content) {
                throw new Error('服务器返回了无效的响应格式');
            }
        } catch (error) {
            throw new Error(error.message || '无法连接到服务器');
        }

        const aiResponse = responseData.choices[0].message.content;
        
        // 显示 AI 响应
        addMessage(aiResponse);
        
        // 添加 AI 响应到历史记录
        messages.push({ role: 'assistant', content: aiResponse });
        
        // 保存更新后的对话
        saveCurrentConversation();
        
    } catch (error) {
        console.error('发送消息失败:', error);
        let errorMessage = '抱歉，发生了一些错误。';
        
        if (error.message.includes('请求超时')) {
            errorMessage = '服务器响应时间过长，请稍后重试。';
        } else if (error.message.includes('无效的数据格式')) {
            errorMessage = '服务器返回了无效的响应，请稍后重试。';
        } else if (error.message.includes('API 请求失败')) {
            errorMessage = error.message;
        } else if (error.message.includes('无法连接到服务器')) {
            errorMessage = '无法连接到服务器，请检查网络连接。';
        }
        
        addMessage(errorMessage);
    } finally {
        // 隐藏加载指示器
        loadingIndicator.classList.add('hidden');
    }
}

// 处理发送按钮点击
sendButton.addEventListener('click', async () => {
    const content = userInput.value.trim();
    if (content) {
        userInput.value = '';
        adjustTextareaHeight();
        await sendMessage(content);
    }
});

// 处理回车键发送
userInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const content = userInput.value.trim();
        if (content) {
            userInput.value = '';
            adjustTextareaHeight();
            await sendMessage(content);
        }
    }
});

// 自动调整文本框高度
userInput.addEventListener('input', adjustTextareaHeight);

// 主题切换
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    // 保存主题偏好
    localStorage.setItem('theme', newTheme);
});

// 清除对话历史
clearButton.addEventListener('click', () => {
    if (confirm('确定要清除所有对话历史吗？此操作不可恢复。')) {
        messages = [];
        conversations = [];
        currentConversationId = null;
        localStorage.removeItem('conversations');
        chatContainer.innerHTML = '';
        addMessage('你好！我是你的 AI 生活教练。我可以帮助你解决生活中的问题，提供建议和指导。请告诉我你最近遇到了什么困扰？');
        renderConversationList();
    }
});

// 切换侧边栏
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

// 新对话按钮
newChatButton.addEventListener('click', () => {
    createNewConversation();
});

// 初始化
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

// 加载对话历史
loadConversations(); 