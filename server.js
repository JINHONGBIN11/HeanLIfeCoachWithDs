const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API 配置
const API_KEY = '71ca1010-f2f4-47c1-b5fe-a6a0f21cf335';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 处理聊天请求的路由
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
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
                ],
                stream: true,
                temperature: 0.6
            })
        });

        // 设置响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 将流式响应转发给客户端
        response.body.pipe(res);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 