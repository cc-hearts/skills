# Business Component Design & Playground Guidelines (Generic Agent Rule)

适用场景：在编写、抽离、重构前端业务组件（Vue3 / React / UI框架）时生效。

## 1. 核心铁律：副作用隔离与纯净契约
- 业务组件必须是**纯受控或无害的独立零件**，严禁在组件内部写死直接的网络请求（`axios/fetch/request`）或直接路由跳转（`router.push`）。
- 组件通信标准：
  - **数据流入**：一律通过 `Props`（并定义精确的 TypeScript 接口与 Default 默认值）。
  - **行为流出**：一律通过 `Emits`（附带语义化事件名和 payload 载荷）。
  - **结构定制**：一律通过 `Slots`（插槽提供扩展点）。

## 2. 本地交互沙箱（Playground Driven）
- 即使项目没有引入 Storybook、Histoire 或特定构建工具，也必须为组件配齐：
  1. `mock.ts`：至少提供标准态、空数据态、极端溢出态 3 组数据。
  2. `playground.vue`：一个自带控制按钮（切换 Loading/状态）和实时 Emit 事件日志看板的本地调试文件。
- 严禁未经本地沙箱/Mock 验证直接将未成熟的代码混入具体业务页面中。

## 3. 业务页面（Page）纯装配角色
- 页面（Page/Container）只作为“胶水层”：调用真实 API 获取数据，将数据传给组件 Props，监听组件 Emits 调用变更接口。
- 严禁在 Page 内部直接堆砌弹窗或超 50 行的非容器 UI 代码。
