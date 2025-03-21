require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 使用环境变量获取 API 密钥
const API_KEY = process.env.DEEPSEEK_API_KEY;

// 检查必要的环境变量
if (!API_KEY) {
    console.error('错误: 未设置 DEEPSEEK_API_KEY 环境变量');
    process.exit(1);
}

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API 配置
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 处理聊天请求的路由
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        // 设置响应头，启用流式传输
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 发送请求到 DeepSeek API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: messages,
                stream: true
            })
        });
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }
        
        // 将 API 响应流式传输到客户端
        response.body.pipe(res);
        
    } catch (error) {
        console.error('API 调用错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});