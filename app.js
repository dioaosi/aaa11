class 聊天客户端 {
    constructor() {
        this.历史记录 = JSON.parse(localStorage.getItem('聊天历史')) || [];
        this.AI列表 = [];
        this.当前活跃请求 = new Set();
        this.聊天框 = document.getElementById('聊天记录');
        
        // 初始化时渲染历史记录
        this.渲染历史记录();
    }
    渲染历史记录() {
        this.历史记录.forEach(记录 => {
            const 消息元素 = document.createElement('div');
            消息元素.className = 记录.role === 'user' ? '消息 用户消息' : '消息 AI消息';
            消息元素.textContent = `${记录.speaker}: ${记录.content}`;
            this.聊天框.appendChild(消息元素);
        });
        this.聊天框.scrollTop = this.聊天框.scrollHeight;
    }
    注册AI(AI配置) {
        this.AI列表.push({
            名称: AI配置.名称,
            角色: AI配置.角色,
            模型: AI配置.模型,
            API密钥: AI配置.API密钥,
            活跃: true
        });
    }

    async 发送消息(用户输入) {
        this.添加消息('user', 用户输入, '用户');
        await Promise.all(
            this.AI列表.filter(AI => AI.活跃)
                .map(AI => this.触发AI回复(AI, 用户输入))
        );
    }

    async 触发AI回复(AI, 用户输入) {
        this.更新状态(`${AI.名称}正在思考...`);
        
        const 控制器 = new AbortController();
        try {
            this.当前活跃请求.add(控制器);
            
            const 响应 = await fetch(配置.API地址, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AI.API密钥}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: AI.模型,
                    messages: this.生成对话上下文(AI, 用户输入),
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 1024
                }),
                signal: 控制器.signal
            });

            if (!响应.ok) throw new Error(`网络错误 ${响应.status}`);
            await this.处理流响应(AI, 响应);

        } catch (错误) {
            if (错误.name !== 'AbortError') {
                this.log(`${AI.名称}出错: ${错误.message}`);
            }
        } finally {
            this.当前活跃请求.delete(控制器);
            if (this.当前活跃请求.size === 0) this.更新状态("准备就绪");
        }
    }

    生成对话上下文(AI, 用户输入) {
        const 系统消息 = {
            role: "system",
            content: `你是${AI.名称}，角色：${AI.角色}。对话参与者：${this.AI列表.map(a => a.名称).join(', ')}`
        };

        const 历史上下文 = this.历史记录
            .filter(记录 => 记录.speaker !== AI.名称)
            .map(记录 => ({
                role: 记录.role,
                content: `[${记录.speaker}] ${记录.content}`
            }));

        return [系统消息, ...历史上下文, { role: 'user', content: 用户输入 }];
    }

    async 处理流响应(AI, 响应) {
        const 会话ID = Date.now();
        const 阅读器 = 响应.body.getReader();
        const 解码器 = new TextDecoder();
        
        const [思考元素, 回答元素] = this.创建消息容器(AI, 会话ID);
        let 思考内容 = "", 正式回答 = "";

        while (true) {
            const { done, value } = await 阅读器.read();
            if (done) break;

            for (const 数据 of this.解析数据块(解码器.decode(value))) {
                if (数据.reasoning_content) {
                    思考内容 += 数据.reasoning_content;
                    思考元素.innerHTML = `${AI.名称}思考中: ${思考内容.replace(/\n/g, '<br>')}`;
                }

                if (数据.content) {
                    正式回答 += 数据.content;
                    回答元素.innerHTML = `${AI.名称}: ${this.安全转义(正式回答).replace(/\n/g, '<br>')}`;
                    this.聊天框.scrollTop = this.聊天框.scrollHeight;
                }
            }
        }

        this.保存历史记录('assistant', 正式回答, AI.名称);
        this.触发后续回复(AI.名称, 正式回答);
        this.折叠思考元素(思考元素);
    }

    创建消息容器(AI, 会话ID) {
        const 思考元素 = document.createElement('div');
        思考元素.className = '思考过程';
        思考元素.textContent = `${AI.名称}思考中: `;

        const 回答元素 = document.createElement('div');
        回答元素.className = '消息 AI消息';
        回答元素.dataset.aiName = AI.名称;

        this.聊天框.append(思考元素, 回答元素);
        return [思考元素, 回答元素];
    }

    触发后续回复(来源AI名称, 内容) {
        this.AI列表.filter(AI => 
            AI.名称 !== 来源AI名称 && 
            AI.活跃 &&
            this.需要回复(AI, 内容)
        ).forEach(AI => this.触发AI回复(AI, `${来源AI名称}说：${内容}`));
    }

    需要回复(AI, 内容) {
        const 触发词 = [AI.名称, "大家", "你们", "讨论", "意见", "@"+AI.名称];
        return 触发词.some(词 => 内容.includes(词)) || Math.random() < 0.3;
    }

    安全转义(文本) {
        const div = document.createElement('div');
        div.textContent = 文本; // textContent是属性不是方法
        return div.innerHTML;
    }

    折叠思考元素(元素) {
        setTimeout(() => {
            元素.classList.add('已折叠');
            元素.onclick = () => 元素.classList.toggle('已折叠');
        }, 500);
    }

    保存历史记录(角色, 内容, 发言者 = '用户') {
        this.历史记录.push({ 
            role: 角色, 
            content: 内容,
            speaker: 发言者
        });
        
        // 本地存储限制处理
        if (this.历史记录.length > 配置.最大历史记录 * 2) {
            this.历史记录 = this.历史记录.slice(-配置.最大历史记录 * 2);
        }
        
        // 保存到localStorage
        localStorage.setItem('聊天历史', JSON.stringify(this.历史记录));
    }
    清除历史() {
        this.历史记录 = [];
        localStorage.removeItem('聊天历史');
        this.聊天框.innerHTML = '';
    }
    添加消息(角色, 内容, 发言者) {
        const 消息元素 = document.createElement('div');
        消息元素.className = 角色 === 'user' ? '消息 用户消息' : '消息 AI消息';
        消息元素.textContent = `${发言者}: ${内容}`;
        this.聊天框.appendChild(消息元素);
        this.保存历史记录(角色, 内容, 发言者);
    }

    更新状态(文本) {
        document.getElementById('状态栏').textContent = 文本;
    }

    log(文本) {
        const 消息元素 = document.createElement('div');
        消息元素.className = '消息 系统消息';
        消息元素.textContent = `[系统] ${文本}`;
        this.聊天框.appendChild(消息元素);
    }

    解析数据块(原始数据) {
        return 原始数据.split('\n') // 修正变量名大小写
            .filter(l => l.trim() && l.startsWith('data: ') && l !== 'data: [DONE]')
            .map(l => {
                try { 
                    const 数据块 = JSON.parse(l.slice(6));
                    return 数据块.choices?.[0]?.delta || {}; // 添加安全访问
                } catch { 
                    return null; 
                }
            })
            .filter(Boolean);
    }
    
}


// 初始化客户端并注册配置中的AI
const 客户端 = new 聊天客户端();
配置.AI列表.forEach(AI配置 => 客户端.注册AI(AI配置));

// 保持原有发送逻辑不变
function 处理发送() {
    const 输入框 = document.getElementById('用户输入');
    const 用户输入 = 输入框.value.trim();
    
    if (!用户输入) {
        alert('请输入内容！');
        return;
    }
    
    输入框.value = '';
    客户端.发送消息(用户输入);
}

document.getElementById('用户输入').addEventListener('keypress', (事件) => {
    if (事件.key === 'Enter' && !事件.shiftKey) {
        事件.preventDefault();
        处理发送();
    }
});
function 清除历史() {
    if(confirm('确定要清除所有聊天记录吗？')) {
        客户端.清除历史();
    }
}