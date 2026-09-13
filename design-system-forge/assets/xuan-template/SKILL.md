---
name: xuan
description: 宣（Xuan）设计系统 v0.1 —— 纸感编辑风的 Web 界面约定。凡是用 AI 生成或修改 Web 页面、博客、文档类界面（HTML/CSS/React/Vue 均可）时必须遵循：颜色一律引用 tokens.css 里的变量，遵守三条铁律，交付前运行 node verify.mjs 并清零报错。
---

# 宣 Xuan · 给 AI 的设计约定

## 领地

浏览器里承载文字的页面：博客、产品页、文档站。
不管印刷、不管原生 App、不管营销页的炫技动效。

## 主张

**层级靠字阶和留白，不靠颜色和阴影。**
拿不准的时候，用这句话裁判；这句话也裁不动时，选更克制的那一个。

## 三条铁律（不可协商）

### 铁律一 · 一种主色，只给值得被记住的地方

- 主色 `--accent` 只允许出现在：链接、当前态/选中态、关键数字或图标、焦点 ring。
- 任何大面积区块（背景、横幅、整段文字）不得使用主色；需要主色氛围时用 `--accent-wash`。
- 理由：主色面积超过 5%，就从克制变成堆砌，界面立刻变吵。

### 铁律二 · 三档暖灰，各司其职

- 纸（表面）：`--paper` 页面底 / `--paper-raised` 卡片浮层 / `--paper-sunk` 代码块与井。
- 线：`--line` 常规边框与分割 / `--line-strong` 输入框描边与强分割。
- 墨（文字）使用权限：`--ink` 标题正文 / `--ink-soft` 次要说明 / `--ink-faint` 仅限时间戳与占位符，**禁止用于长文**（低对比伤可读性）。
- 禁止使用 Tailwind 默认 neutral/gray/slate/zinc 色阶——它们是冷灰，会把纸感变成仪表盘感。所有颜色一律引用 token 变量，禁止裸色值。

### 铁律三 · 层级靠字号与字族，不靠加粗和阴影

- 中文标题字重 500 封顶：层级由 `--font-serif` 和更大字号承担。禁 font-bold/semibold/extrabold/black，禁 font-weight 600 以上。
  理由：中文缺少中间字重，浏览器合成加粗会发糊。
- 禁硬阴影。深度只有四种表达：一条 `--line` 边框、一个 `--paper-sunk` 井、一层 `--shadow-whisper`、焦点态 `--ring`。
- 圆角上限 `--radius-lg`（12px）；胶囊标签与头像可用 999px。

## 决策表

| 要做什么 | 怎么做 |
|---|---|
| 页面底色 | `var(--paper)` |
| 一级标题 | serif · `--text-3xl` · `--ink` · 字重 400–500 |
| 小标题 | serif · `--text-xl` · `--ink` · 字重 500 |
| 正文长文 | sans · `--text-base` · `--leading-body` · `--ink` |
| 长文正文（可选书卷气） | serif · `--text-lg` · `--leading-body` |
| 引文与题词 | kai（`--font-kai`）· `--text-lg` · `--ink-soft` · 左侧 3px `--line-strong` 边 |
| 次要说明 | `--text-sm` · `--ink-soft` |
| 强调一个词 | `--accent` 或换 serif 字族；不加粗 |
| 链接 | `--accent`，hover 用 `--accent-ink`；正文内链接加下划线 |
| 卡片 | `--paper-raised` 底 + 1px `--line` 边 + `--radius-lg` + `--shadow-whisper` |
| 代码块 | `--paper-sunk` 底 + mono · `--text-sm` + `--radius-md` |
| 标签 chip | `--accent-wash` 底 + `--accent-ink` 字 + 999px 圆角 |
| 主按钮 | `--accent` 底 + `--paper` 字；次按钮 = 纸底 + `--line-strong` 边 + `--ink` 字 |
| 选中/当前态 | `--accent-wash` 底，或左侧 3px `--accent` 边 |
| 分割线 | 1px `--line`，上下留白不小于 `--space-8` |
| 焦点态 | `box-shadow: var(--ring)` |
| 空状态 | `--paper-sunk` 插图位 + `--ink-faint` 一句话 |
| 章节间距 | `--space-16` 起步，重要章节之间 `--space-24` |

表里没有的情况：回到三条铁律自行推导，并说明推导过程。**不要发明新 token**——缺了先补 tokens.css，再回来用。

serif 与 kai 两族依赖 webfont（Noto Serif SC、LXGW WenKai Screen），页面头部引入对应 CSS，写法见 index.html；离线环境自动回退到本机宋体/楷体。

## 反面示例（每一条都真实拦截过）

| 别这样 | 该这样 | 为什么 |
|---|---|---|
| text-neutral-500 这类冷灰 | `var(--ink-soft)` | 冷灰毁掉纸感，画面变仪表盘 |
| 中文标题加粗（600 以上） | serif + 更大一级字号 + 字重 500 | 合成加粗发糊，层级本该由字号承担 |
| 黑色投影 box-shadow | `--line` 边框 + `--shadow-whisper` | 硬阴影是另一种"用颜色堆层级" |
| 主色铺满横幅背景 | `--paper-raised` 底，主按钮局部用色 | 主色 ≤5%，超了就吵 |
| 大圆角（16px 以上） | `--radius-lg`（12px） | 大圆角是圆润玩具感，不是纸 |

## 交付前（强制）

```bash
node verify.mjs
```

- 报错必须清零。确需例外，在那一行行尾加注释 `xuan:allow` 并写明理由；只许豁免个别行，不许豁免整个文件。
- verify 只能证明"没违反铁律"，不能证明"好看"。完成后对照主张自查一遍：层级是否靠字阶和留白成立。

## 兜底

本约定没有覆盖的场景，按顺序回退：铁律 → 主张 → 领地。仍然拿不准，选更克制的那一个。
