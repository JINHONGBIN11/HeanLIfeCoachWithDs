const fetch = require('node-fetch');

// 使用环境变量获取 API 密钥
const API_KEY = process.env.ARK_API_KEY || 'sk-5d5b98f077914f0bb4fd1b4cb632b2e8';
const API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

// 检查必要的环境变量
if (!API_KEY) {
    console.error('错误: 未设置 ARK_API_KEY 环境变量');
} else {
    console.log('API Key 已设置，长度:', API_KEY.length);
    console.log('API Key 前8位:', API_KEY.substring(0, 8) + '...');
}

console.log('API URL:', API_URL);

module.exports = async (req, res) => {
    console.log('收到请求:', {
        method: req.method,
        headers: req.headers,
        body: req.body
    });

    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        console.log('处理 OPTIONS 请求');
        res.status(200).end();
        return;
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
        console.log('不支持的请求方法:', req.method);
        return res.status(405).json({ error: '方法不允许' });
    }

    try {
        console.log('收到聊天请求');
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            console.error('无效的消息格式:', messages);
            return res.status(400).json({ error: '无效的请求格式' });
        }

        // 限制消息长度
        const truncatedMessages = messages.slice(-2).map(msg => ({
            role: msg.role,
            content: msg.content.slice(0, 300) // 减少每条消息的最大长度
        }));

        console.log('准备发送到 DeepSeek API，消息:', truncatedMessages);
        
        // 发送请求到 DeepSeek API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 设置为 8 秒，确保在 Vercel 超时前完成

        try {
            console.log('发送请求到 DeepSeek API');
            console.log('请求URL:', API_URL);
            console.log('请求头:', {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            });
            console.log('请求体:', {
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    ...messages
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 1000,
                top_p: 0.8,
                presence_penalty: 0.6,
                frequency_penalty: 0.6
            });
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant.' },
                        ...messages
                    ],
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 1000,
                    top_p: 0.8,
                    presence_penalty: 0.6,
                    frequency_penalty: 0.6
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('DeepSeek API 错误:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
            }

            console.log('收到 DeepSeek API 响应');

            // 设置响应头
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');

            // 获取完整响应
            const data = await response.json();
            console.log('API 响应:', data);
            
            // 发送响应
            try {
                res.json(data);
                console.log('响应已发送');
            } catch (error) {
                console.error('发送响应时出错:', error);
                res.status(500).json({ 
                    error: '发送响应失败',
                    message: error.message
                });
            }
            
        } catch (error) {
            console.error('API 调用错误:', error);
            clearTimeout(timeoutId);
            
            // 发送详细的错误信息
            if (error.name === 'AbortError') {
                console.error('请求超时');
                res.status(504).json({ 
                    error: '请求超时',
                    message: '服务器处理请求超时，请尝试发送更短的消息，或稍后重试。'
                });
            } else {
                console.error('API 错误:', error);
                res.status(500).json({ 
                    error: '服务器错误',
                    message: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        }
    } catch (error) {
        console.error('处理请求时出错:', error);
        res.status(500).json({ 
            error: '服务器错误',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};