require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const app = express();

// 使用环境变量获取 API 密钥
const API_KEY = process.env.DEEPSEEK_API_KEY;

// 检查必要的环境变量
if (!API_KEY) {
    console.error('错误: 未设置 DEEPSEEK_API_KEY 环境变量');
    process.exit(1);
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API 路由
app.post('/api/chat', async (req, res) => {
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
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 秒超时

        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一位专业的生活教练，擅长帮助人们解决生活中的问题，提供建设性的建议和指导。请以温和、专业的态度与用户交流。'
                        },
                        ...messages.slice(-2)
                    ],
                    stream: false, // 禁用流式响应
                    max_tokens: 300,
                    temperature: 0.7,
                    presence_penalty: 0.6
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
});

// 处理所有其他路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('全局错误处理:', err);
    res.status(500).json({ 
        error: '服务器错误',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 仅在非 Vercel 环境下启动服务器
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`服务器运行在 http://localhost:${port}`);
    });
}

// 导出应用实例供 Vercel 使用
module.exports = app;