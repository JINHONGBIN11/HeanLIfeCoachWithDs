# AI 生活教练

一个基于 DeepSeek API 的智能生活教练应用，为用户提供个性化的生活建议和指导。

## 功能特点

- 💬 实时对话：与 AI 生活教练进行自然语言交流
- 🔄 历史记录：保存并查看历史对话内容
- 🌓 深色模式：支持浅色/深色主题切换
- 📱 响应式设计：完美适配桌面和移动设备
- 🔒 安全存储：本地存储对话历史，保护隐私

## 技术栈

- 前端：HTML5, CSS3, JavaScript
- 后端：Node.js, Express
- API：DeepSeek Chat API
- 存储：LocalStorage
- 部署：Vercel

## 快速开始

1. 克隆仓库
```bash
git clone https://github.com/JINHONGBIN11/HeanLIfeCoachWithDs.git
cd HeanLIfeCoachWithDs
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env` 文件并添加以下内容：
```
DEEPSEEK_API_KEY=your_api_key_here
PORT=3000
```

4. 启动服务器
```bash
node server.js
```

5. 访问应用
打开浏览器访问 http://localhost:3000

## 部署

本项目可以轻松部署到 Vercel：

1. Fork 这个仓库
2. 在 Vercel 中导入项目
3. 设置环境变量 `DEEPSEEK_API_KEY`
4. 完成部署

## 使用说明

1. **开始对话**
   - 在输入框中输入您的问题或困扰
   - 点击发送按钮或按回车键发送消息
   - AI 生活教练会给出专业的建议和指导

2. **查看历史对话**
   - 点击左侧边栏查看历史对话列表
   - 点击任意对话可以继续之前的交流
   - 使用"新对话"按钮开始新的会话

3. **主题切换**
   - 点击右上角的主题切换按钮
   - 在浅色和深色主题之间切换

4. **清除历史**
   - 使用清除按钮可以删除所有对话历史
   - 删除前会要求确认，防止误操作

## 隐私说明

- 所有对话历史仅保存在本地浏览器中
- 不会将对话内容上传到云端存储
- 可以随时清除所有历史记录

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License 