# 刷题助手 · 通用题库练习 (H5)

一个轻量、通用的刷题 / 考试 H5 应用。移动端优先,响应式设计,PC/手机都能用。

## 功能特性

- **4 种题型**:单选 / 多选 / 判断 / 填空
- **3 种练习模式**:普通练习 / 错题复习 / 收藏复习
- **模拟考试**:自定义时长和题量,倒计时 / 自动交卷 / 答题卡 / 成绩单
- **题库管理**:支持 JSON 导入导出、批量导入、题目增删改查
- **学习统计**:每日进度、历史记录、错题率、题型分布
- **数据本地化**:全部数据存浏览器 localStorage,无需后端服务器
- **完全离线运行**:只要静态托管一次,后续不依赖任何网络

## 内置题库

- **示例题库**:计算机基础入门(12 题)、通识常识小测(8 题),首次打开自动加载
- **C3 安全生产考核题库(第六批,共 2965 题)**:来自广东省建筑施工企业综合类专职安全生产管理人员(C3 类)安全生产考核第六批题库,按题型分为 3 个题库
  - 单选题 1852 题(4 选项)
  - 多选题 616 题(5 选项)
  - 判断题 497 题
  - 部分题目自动提取了题干中的法律法规名称作为标签(如《建筑起重机械安全监督管理规定》),可按法规专项练习
  - 首次打开自动导入;如手动删除,可通过「题库 → 导入」重新导入 `data/c3-bank.json`

题库来源 PDF 的解析脚本见 `data/parse_c3.py`(提取文本在 `data/c3-raw.txt`),官方更新题库后可重新解析。

## 启动 / 部署

### 本地预览

```bash
# 进入项目目录
cd path/to/quiz-app

# 用 Python 起一个静态服务器(任选其一)
python -m http.server 8080
# 或者
python3 -m http.server 8080

# 浏览器打开
open http://localhost:8080
```

### 部署到静态托管

直接把整个项目目录上传到任意静态托管平台即可,例如:
- Vercel / Netlify / Cloudflare Pages
- 腾讯云 EdgeOne Pages / 阿里云 OSS / 七牛
- GitHub Pages

无需任何构建步骤,无需后端。

### 添加到手机主屏幕

用手机浏览器(建议 Safari / Chrome)打开部署好的网址,然后:
- iOS: 分享菜单 → 添加到主屏幕
- Android: 菜单 → 添加到主屏幕 / 安装应用

即可像 App 一样使用。

## 题库 JSON 格式

可以是单个题库(精简格式),也可以是包含 `banks` 数组的完整结构(用于备份或批量导入)。

### 单题库格式

```json
{
  "name": "示例题库",
  "description": "可选描述",
  "tags": ["标签1", "标签2"],
  "questions": [
    {
      "type": "single",
      "stem": "中国首都是?",
      "options": ["北京", "上海", "广州", "深圳"],
      "answer": "北京",
      "explanation": "可选解析",
      "tags": ["地理"],
      "difficulty": 1
    },
    {
      "type": "multiple",
      "stem": "下列哪些是编程语言?",
      "options": ["HTML", "Python", "Java", "CSS"],
      "answer": ["Python", "Java"]
    },
    {
      "type": "judge",
      "stem": "地球是圆的",
      "answer": true
    },
    {
      "type": "fill",
      "stem": "《静夜思》作者是___朝诗人___。",
      "answer": ["唐", "李白"]
    }
  ]
}
```

### 完整备份格式

```json
{
  "banks": [ /* 上面这种题库数组 */ ],
  "records": [ /* 历史记录(可选) */ ],
  "settings": { /* 设置(可选) */ }
}
```

### 题目字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `type` | ✅ | `single` 单选 / `multiple` 多选 / `judge` 判断 / `fill` 填空 |
| `stem` | ✅ | 题干。填空题用 `___`(连续 2 个以上下划线)表示空位 |
| `options` | 单选/多选必填 | 选项数组。导入时支持 `A. xxx` 前缀,会自动剥离 |
| `answer` | ✅ | 单选 `string` / 多选 `string[]` / 判断 `boolean` / 填空 `string[]`(顺序对应空位) |
| `explanation` |  | 解析,答题后展示 |
| `tags` |  | 标签数组,用于过滤和分类 |
| `difficulty` |  | 1-5,展示用 |

### 填空题答案格式

填空题的题干中,每个 `___`(连续下划线)代表一个空位,答案按出现顺序用 `||` 分隔(在 UI 中)或直接传数组:

```json
"stem": "TCP 默认端口是___;UDP 默认端口是___。",
"answer": ["80", "53"]
```

## 项目结构

```
.
├── index.html              入口
├── css/style.css           样式
├── js/
│   ├── app.js              主入口 + 路由
│   ├── storage.js          数据层 (localStorage)
│   ├── questionTypes.js    题型与判分
│   ├── ui.js               Toast/Modal/Confirm
│   └── pages/
│       ├── home.js
│       ├── bank.js
│       ├── practice.js
│       ├── exam.js
│       ├── stats.js
│       └── settings.js
├── data/
│   └── sample-questions.json   示例题库
└── docs/
```

## 数据隐私

所有数据(题库、错题、记录)均存储在你自己的浏览器 localStorage,不上传任何服务器。清浏览器缓存会丢失数据,建议定期在「设置」中导出备份。