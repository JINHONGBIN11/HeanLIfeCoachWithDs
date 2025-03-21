const fetch = require('node-fetch');

// 设置超时时间为 50 秒
const TIMEOUT = 50000;

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
        throw error;
    }
};

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

        // 从环境变量获取 API 配置
        const API_KEY = process.env.DEEPSEEK_API_KEY;
        const API_URL = process.env.DEEPSEEK_API_URL;
        
        if (!API_KEY) {
            throw new Error('未设置 DEEPSEEK_API_KEY 环境变量');
        }

        if (!API_URL) {
            throw new Error('未设置 DEEPSEEK_API_URL 环境变量');
        }

        console.log('开始请求 DeepSeek API...');
        console.log('API URL:', API_URL);
        
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
                        content: '你是一位专业的生活教练，擅长帮助人们解决生活中的问题，提供建设性的建议和指导。请以温和、专业的态度与用户交流。'
                    },
                    ...messages
                ]
            })
        });

        console.log('DeepSeek API 响应状态:', response.status);

        const responseText = await response.text();
        console.log('DeepSeek API 响应内容:', responseText);

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status} - ${responseText}`);
        }

        try {
            const data = JSON.parse(responseText);
            console.log('成功解析 DeepSeek API 响应');
            res.status(200).json(data);
        } catch (parseError) {
            console.error('JSON 解析错误:', parseError);
            throw new Error(`响应格式错误: ${responseText}`);
        }
        
    } catch (error) {
        console.error('API 调用错误:', error);
        
        // 根据错误类型返回适当的状态码和格式化的错误信息
        if (error.name === 'AbortError') {
            res.status(504).json({ 
                error: '请求超时',
                message: '服务器响应时间过长，请稍后重试'
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