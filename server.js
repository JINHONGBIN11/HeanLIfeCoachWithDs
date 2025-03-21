require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
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
        const { messages } = req.body;
        
        // 设置响应头，启用流式传输
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 发送请求到 DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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

// 处理所有其他路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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