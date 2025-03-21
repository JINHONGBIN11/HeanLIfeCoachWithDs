const fetch = require('node-fetch');

// 使用环境变量获取 API 密钥
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = process.env.DEEPSEEK_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 检查必要的环境变量
if (!API_KEY) {
    console.error('错误: 未设置 DEEPSEEK_API_KEY 环境变量');
}

// 配置 Edge Runtime
export const config = {
    runtime: 'edge',
    regions: ['hkg1'], // 使用香港区域，可能更快
};

export default async function handler(req) {
    // 设置 CORS 头
    const headers = {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
    };

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: '方法不允许' }), {
            status: 405,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }

    try {
        console.log('收到聊天请求');
        const { messages } = await req.json();
        
        if (!messages || !Array.isArray(messages)) {
            console.error('无效的消息格式:', messages);
            return new Response(JSON.stringify({ error: '无效的请求格式' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // 限制消息长度
        const truncatedMessages = messages.slice(-2).map(msg => ({
            role: msg.role,
            content: msg.content.slice(0, 500) // 限制每条消息的长度
        }));

        console.log('准备发送到 DeepSeek API');
        
        // 发送请求到 DeepSeek API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 设置为 25 秒，给予足够的思考时间

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
                        ...truncatedMessages
                    ],
                    stream: true, // 启用流式响应
                    temperature: 0.7, // 增加一些随机性
                    max_tokens: 1000, // 允许更长的响应
                    top_p: 0.8, // 控制输出的多样性
                    presence_penalty: 0.6, // 减少重复内容
                    frequency_penalty: 0.6 // 增加输出的多样性
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

            // 创建 TransformStream 来处理流式响应
            const stream = new TransformStream({
                async transform(chunk, controller) {
                    const text = new TextDecoder().decode(chunk);
                    const lines = text.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                controller.enqueue('data: [DONE]\n\n');
                                controller.terminate();
                                return;
                            }
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.choices?.[0]?.delta?.content) {
                                    controller.enqueue(`data: ${JSON.stringify(parsed.choices[0].delta)}\n\n`);
                                }
                            } catch (e) {
                                console.error('解析响应数据错误:', e);
                            }
                        }
                    }
                }
            });

            // 返回流式响应
            return new Response(response.body.pipeThrough(stream), {
                headers: {
                    ...headers,
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            });
            
        } catch (error) {
            console.error('API 调用错误:', error);
            clearTimeout(timeoutId);
            
            // 发送详细的错误信息
            if (error.name === 'AbortError') {
                return new Response(JSON.stringify({ 
                    error: '请求超时',
                    message: '服务器处理请求超时，请稍后重试。'
                }), {
                    status: 504,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            } else {
                return new Response(JSON.stringify({ 
                    error: '服务器错误',
                    message: error.message
                }), {
                    status: 500,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            }
        }
    } catch (error) {
        console.error('API 调用错误:', error);
        return new Response(JSON.stringify({ 
            error: '服务器错误',
            message: error.message
        }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}