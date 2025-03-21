const fetch = require('node-fetch');

// 设置超时时间为 30 秒
const TIMEOUT = 30000;

// 创建带超时的 fetch
const fetchWithTimeout = async (url, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            throw new Error('请求超时，请稍后重试');
        }
        throw error;
    }
};

// 简化系统提示以减少 token 数量
const SYSTEM_PROMPT = '你是AI生活教练';

// 预处理消息，减少 token 数量
function preprocessMessages(messages) {
    return messages.map(msg => ({
        role: msg.role,
        content: msg.content.slice(0, 200) // 限制每条消息的长度
    }));
}

module.exports = async (req, res) => {
    // 启用 CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: '方法不允许',
            message: '只支持 POST 请求'
        });
    }

    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ 
                error: '无效的请求格式',
                message: '消息必须是数组格式'
            });
        }

        // 限制消息历史长度，只保留最后 2 条消息
        const recentMessages = messages.slice(-2);
        
        // 预处理消息
        const processedMessages = preprocessMessages(recentMessages);

        // 从环境变量获取 API 配置
        const API_KEY = process.env.DEEPSEEK_API_KEY;
        const API_URL = process.env.DEEPSEEK_API_URL;
        
        if (!API_KEY) {
            throw new Error('未设置 DEEPSEEK_API_KEY 环境变量');
        }

        if (!API_URL) {
            throw new Error('未设置 DEEPSEEK_API_URL 环境变量');
        }

        // 发送请求到 DeepSeek API
        const response = await fetchWithTimeout(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-r1-250120',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT
                    },
                    ...processedMessages
                ],
                max_tokens: 300,  // 进一步限制响应长度
                temperature: 0.5,  // 降低随机性以加快响应
                top_p: 0.8,       // 限制采样范围以加快响应
                presence_penalty: 0,
                frequency_penalty: 0
            })
        });

        const responseText = await response.text();

        // 如果响应不是 JSON 格式，创建一个标准格式的响应
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            // 如果响应不是 JSON，但状态码是 200，则将文本作为消息内容
            if (response.ok) {
                data = {
                    choices: [{
                        message: {
                            content: responseText.slice(0, 500) // 限制响应长度
                        }
                    }]
                };
            } else {
                throw new Error(responseText || '服务器返回了无效的响应');
            }
        }

        if (!response.ok) {
            throw new Error(data.error?.message || `API 请求失败: ${response.status}`);
        }

        // 确保响应格式正确
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('API 响应格式无效');
        }

        res.status(200).json(data);
        
    } catch (error) {
        console.error('API 调用错误:', error);
        
        // 根据错误类型返回适当的状态码和格式化的错误信息
        if (error.name === 'AbortError') {
            res.status(504).json({ 
                error: '请求超时',
                message: '请尝试发送更短的消息，或稍后重试'
            });
        } else if (error.message.includes('JSON')) {
            res.status(502).json({ 
                error: '响应格式错误',
                message: '服务器返回了无效的数据格式'
            });
        } else {
            res.status(500).json({ 
                error: '服务器错误',
                message: error.message
            });
        }
    }
}