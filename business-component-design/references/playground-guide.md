# 本地 Playground 沙箱零依赖接入指南

为了让每个业务组件都能在本地即时调试，且不给项目增加笨重的打包负担，推荐以下 3 种轻量接入方案：

---

## 方案 1：开发环境调试路由 (Dev Playground Route) - 最推荐

在路由表中只在开发环境（`import.meta.env.DEV` 或 `process.env.NODE_ENV === 'development'`）注册一个调试页面：

```typescript
// router/dev-routes.ts
const devRoutes = process.env.NODE_ENV === 'development' ? [
  {
    path: '/dev/playground',
    name: 'DevPlayground',
    // 调试哪个组件就直接引入哪个组件的 playground.vue
    component: () => import('@/components/business/UserSelectModal/playground.vue'),
    meta: { title: '本地组件沙箱调试' }
  }
] : [];

export default devRoutes;
```
- **优点**：零依赖，打包生产环境自动 Tree-shaking 剔除，完全不污染生产包体积。
- **操作**：想测哪个组件，在 `devRoutes` 里换一行 import，或做一个下拉列表动态切组件。

---

## 方案 2：页面原地临时挂载 (In-Page Mount)

如果在开发某页面 `OrderDetail.vue` 时正在重构 `UserSelectModal`：
```vue
<template>
  <div class="order-detail">
    <!-- 1. 业务页面正在调的真实内容 -->
    ...

    <!-- 2. 调试时临时挂载沙箱（验证完了直接删掉这行） -->
    <UserSelectPlayground v-if="isDev" />
  </div>
</template>
```

---

## 方案 3：已有基础设施自动适配 (Storybook / Histoire 渐进增强)

如果项目已经安装了 Storybook 或 Histoire：
- AI 只需将 `playground.vue` 的状态直接转译为 `index.stories.ts`。
- 本规范的设计天然兼容 Storybook 的 `args` 和 `argTypes`，无缝升级。
