// 硅基流动API配置
const 配置 = {
    API密钥: "sk-crlxqnthosoohkmmsofjtctsbdgywsmcznxrjuiobiuorpnj", // 替换实际API密钥
    API地址: "https://api.siliconflow.cn/v1/chat/completions",
    模型名称: "Pro/deepseek-ai/DeepSeek-R1",
    最大历史记录: 999996,
    超时时间: 30000 ,// 30秒
    AI列表: [
        {
            名称: "舒雅",
            角色: "女孩",
            模型: "Pro/deepseek-ai/DeepSeek-R1",
            API密钥: "sk-crlxqnthosoohkmmsofjtctsbdgywsmcznxrjuiobiuorpnj",
            游戏属性:{
                性癖:{},
                敏感带:{},
            }
        },
        {
            名称: "系统",
            角色: "你是个呆毛！!",
            模型: "Pro/deepseek-ai/DeepSeek-R1",
            API密钥: "sk-fbeboitpkvqkzyivqbeheqcigjwvuejolrrmsxcdisifizte"
        }
    ]
};

// 简单验证配置
if(配置.API密钥.length < 20 || /[\u4e00-\u9fa5]/.test(配置.API密钥)){
    console.error("无效的API密钥配置");
    alert("API密钥配置错误，请检查config.js文件");
}
