
# TestFlow — API 测试工作流可视化编辑器

<p align="center">
  <img src="public/logo.png" width="96" alt="TestFlow 图标" />
</p>

<p align="center">
  <strong>拖拽编排 · 可视化执行 · 实时反馈</strong><br/>
  一个基于 React Flow 的 API 自动化测试工作流构建工具
</p>

---

## 📖 简介

TestFlow 是一款**可视化 API 测试工作流编辑器**。你可以在画布上拖拽节点、连线编排测试流程，一键运行并实时查看每个节点的执行状态与变量流转。

```
开始节点 → 请求节点 → 断言节点
```

### 核心特性

- 🎨 **可视化拖拽编排** — 基于 @xyflow/react，拖拽节点、连线搭建测试流程
- ▶️ **一键执行** — 从开始节点出发，按拓扑顺序自动执行
- 🟢 **实时状态反馈** — 节点/端口/连线颜色动态变化，运行状态一目了然
- 📋 **变量上下文** — 左侧面板实时展示所有节点间的变量流转
- 📊 **统计面板** — 自动统计请求/断言节点运行结果
- 💾 **画布持久化** — localStorage 自动保存，支持导入/导出 JSON
- 🔌 **代理转发** — 内置本地代理服务器，解决跨域问题
- 📝 **模板变量** — 支持 `{{host}}` 语法引用上游节点输出

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装

```bash
git clone https://github.com/UyNewNas/TestFlow.git
cd TestFlow
npm install
```

### 启动代理服务器

```bash
node proxy/server.js
```

代理服务器默认运行在 `http://localhost:3128`，用于转发 HTTP 请求避免跨域问题。

### 启动开发服务器

```bash
npm run dev
```

浏览器打开 `http://localhost:5173` 即可开始使用。

---

## 🧱 项目结构

```
TestFlow/
├── index.html                  # HTML 入口
├── package.json                # 项目配置 & 依赖
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
│
├── proxy/
│   └── server.js               # 本地代理服务器
│
├── public/
│   └── logo.png                # 项目图标
│
└── src/
    ├── main.tsx                # 应用入口
    ├── App.tsx                 # 根组件（画布 + 工具栏 + 布局）
    ├── App.css                 # 全局样式
    │
    ├── edges/
    │   └── CustomEdge.tsx      # 自定义连线（实线箭头 + 删除按钮）
    │
    ├── nodes/                   # 节点组件
    │   ├── StartNode.tsx       # 开始节点
    │   ├── HttpRequestNode.tsx # HTTP 请求节点
    │   └── AssertNode.tsx      # 断言节点
    │
    ├── panels/                  # 编辑面板
    │   ├── ConfigPanel.tsx     # 通用配置面板外壳
    │   ├── StartPanel.tsx      # 开始节点面板（变量赋值）
    │   ├── HttpRequestPanel.tsx# HTTP 请求面板
    │   ├── AssertPanel.tsx     # 断言规则面板
    │   ├── ContextViewer.tsx   # 变量上下文查看器
    │   └── StatsBar.tsx        # 统计面板
    │
    ├── store/                   # 状态管理
    │   ├── canvasStore.ts      # 画布状态（多画布、持久化）
    │   ├── flowStore.ts        # 流程状态（执行状态、端口值）
    │   └── updateNodeContext.ts# 节点数据更新上下文
    │
    ├── lib/                     # 核心逻辑
    │   ├── runner.ts           # 工作流执行引擎
    │   ├── topological.ts      # 拓扑排序
    │   ├── validateEdges.ts    # 连线验证
    │   ├── serializer.ts       # 导入导出序列化
    │   └── proxy.ts            # 代理请求工具
    │
    └── types/
        └── nodes.ts            # 类型定义（节点、端口、边）
```

---

## 🎯 节点类型

| 节点 | 说明 |
|------|------|
| **开始节点** 🟢 | 工作流入口。可定义输出变量并为变量赋值（如 `host=http://localhost`） |
| **请求节点** 🔵 | 发送 HTTP 请求。支持 GET/POST/PUT/DELETE/PATCH，`{{变量}}` 模板语法 |
| **断言节点** 🟠 | 验证结果。支持 equal、contains、regex、jsonpath 等多种断言方式 |

---

## 🧪 使用示例

### 场景：加入变量上下文

1. 在**开始节点**面板中添加输出变量 `host`，赋值为 `http://localhost:5173`
2. 添加**请求节点**，URL 填写 `{{host}}/api/users`，方法选择 GET
3. 将开始节点的 `ok` 连接到请求节点的 `执行` 入口
4. 将开始节点的 `host` 连接到请求节点的 `host` 输入
5. 点击 **Run**

执行后：
- 请求节点的 URL 自动解析为 `http://localhost:5173/api/users`
- 左侧变量上下文面板实时展示变量流转
- 节点边框/端口/连线根据执行结果变为绿色（成功）或红色（失败）

### 场景：断言 HTTP 状态码

1. 添加**断言节点**
2. 添加规则：`status_code` `等于` `200`
3. 将请求节点的 `ok` 连到断言节点的 `执行`
4. 将请求节点的 `status_code` 连到断言节点的 `status_code`
5. 运行后统计面板显示 `断言次数 1/1`

---

## 🛠️ 脚本命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 编译 + 生产构建 |
| `npm run lint` | ESLint 代码检查 |
| `npm run preview` | 本地预览生产构建 |
| `node proxy/server.js` | 启动代理服务器 |

### 🖥️ Electron 桌面应用

TestFlow 支持打包为独立的桌面应用，无需 Node.js 环境即可运行。

```bash
# 安装依赖（包含 Electron）
npm install

# 开发模式（两个终端）
# 终端 1: 启动 Vite
npm run electron:dev
# 终端 2: 启动 Electron
npm run electron:start

# 打包为 Windows 安装包
npm run electron:build
```

打包产物输出到 `release/` 目录。

---

## 📦 技术栈

| 技术 | 说明 |
|------|------|
| [React 19](https://react.dev/) | UI 框架 |
| [TypeScript 5](https://www.typescriptlang.org/) | 类型安全 |
| [Vite 6](https://vitejs.dev/) | 构建工具 |
| [@xyflow/react](https://xyflow.com/) | 节点流程图引擎 |
| [jsonpath-plus](https://www.npmjs.com/package/jsonpath-plus) | JSONPath 查询 |
| [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) | 代码规范 |

---

## 📄 许可证

[MIT](LICENSE)

---

<p align="center">
  <sub>v0.1 · Built with ❤️</sub>
</p>
