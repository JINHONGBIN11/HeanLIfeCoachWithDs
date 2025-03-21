const fetch = require('node-fetch');

// 使用环境变量获取 API 密钥
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = process.env.DEEPSEEK_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 检查必要的环境变量
if (!API_KEY) {
    console.error('错误: 未设置 DEEPSEEK_API_KEY 环境变量');
}

module.exports = async (req, res) => {
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
        res.status(200).end();
        return;
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '方法不允许' });
    }

    try {
        console.log('收到聊天请求');
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            console.error('无效的消息格式:', messages);
            return res.status(400).json({ error: '无效的请求格式' });
        }

        console.log('准备发送到 DeepSeek API');
        console.log('API Key:', API_KEY ? '已设置' : '未设置');
        
        // 发送请求到 DeepSeek API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 增加到 30 秒超时

        try {
            const response = await fetch(API_URL, {
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
                            content: '你是一位专业的生活教练，擅长帮助人们解决生活中的问题，提供建设性的建议和指导。请以温和、专业的态度与用户交流。'
                        },
                        ...messages.slice(-2)
                    ]
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
            
            console.log('成功连接到 DeepSeek API');
            
            // 解析响应
            const responseData = await response.json();
            
            if (!responseData.choices?.[0]?.message?.content) {
                console.error('无效的响应格式:', responseData);
                throw new Error('服务器返回了无效的响应格式');
            }
            
            // 发送响应
            res.json(responseData);
            
        } catch (error) {
            console.error('API 调用错误:', error);
            clearTimeout(timeoutId);
            
            // 发送详细的错误信息
            if (error.name === 'AbortError') {
                res.status(504).json({ 
                    error: '请求超时',
                    message: '服务器处理请求超时，请稍后重试。如果问题持续存在，请联系管理员。'
                });
            } else {
                res.status(500).json({ 
                    error: '服务器错误',
                    message: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        }
    } catch (error) {
        console.error('API 调用错误:', error);
        // 发送详细的错误信息
        if (error.name === 'AbortError') {
            res.status(504).json({ 
                error: '请求超时',
                message: '服务器处理请求超时，请尝试发送更短的消息或稍后重试'
            });
        } else {
            res.status(500).json({ 
                error: '服务器错误',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
};