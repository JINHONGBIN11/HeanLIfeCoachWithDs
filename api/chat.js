const fetch = require('node-fetch');

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
        return res.status(405).json({ error: '方法不允许' });
    }

    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: '无效的请求格式' });
        }

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
                    ...messages
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 错误响应:', errorText);
            throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        res.status(200).json(data);
        
    } catch (error) {
        console.error('API 调用错误:', error);
        res.status(500).json({ 
            error: '服务器错误',
            message: error.message
        });
    }
} 