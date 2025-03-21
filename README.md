# AI Life Coach 网站

这是一个基于火山方舟 DeepSeek R1 API 开发的 AI 生活教练网站。通过与 AI 进行对话，获取个性化的建议和指导，帮助用户实现个人成长。

## 项目结构

```
.
├── README.md           # 项目文档
├── package.json        # 项目依赖配置
├── server.js           # Node.js 后端服务器
├── public/            # 静态资源目录
│   ├── index.html     # 主页面
│   ├── styles.css     # 样式文件
│   └── script.js      # 前端交互脚本
└── .env               # 环境变量配置
```

## 功能特点

- 简洁优雅的用户界面
- 实时对话功能
- 流式输出响应
- 响应式设计，适配各种设备
- 安全的 API 密钥管理

## 技术栈

- 前端：HTML5, CSS3, JavaScript
- 后端：Node.js, Express
- API：火山方舟 DeepSeek R1

## 页面结构

### 主页面 (index.html)
- 顶部导航栏：包含网站标题和主题切换
- 对话区域：显示历史对话记录
- 输入区域：用户输入框和发送按钮
- 加载状态指示器

### 样式设计 (styles.css)
- 采用现代简约风格
- 使用柔和的配色方案
- 响应式布局，适配移动端
- 优雅的动画效果

## 开发规范

- 使用语义化 HTML 标签
- 采用 Flexbox 和 Grid 布局
- 遵循 W3C 标准
- 代码添加详细中文注释
- 优化资源加载性能 