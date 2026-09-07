# 跨语言反过度兼容与代码精简参考指南 (Multi-Language Anti-Patterns & Refactoring Guide)

本参考指南旨在帮助 AI 助手与开发者识别不同编程语言中常见的**过度防御性编程、无底线兼容兜底、死代码堆积与过度抽象**，并提供清晰的重构对照。

---

## 1. TypeScript / JavaScript

### ❌ 反模式 1：无底线的链式属性兼容兜底 (Chained Fallback Shims)
```typescript
// BAD: 试图一次性兼容所有历史与未知字段，掩盖真正的数据流
const userName = user?.name ?? user?.displayName ?? user?.user_name ?? user?.profile?.nick ?? 'Anonymous';
const userId = payload?.userId || payload?.user_id || payload?.id || payload?.uid;
```
```typescript
// GOOD: 规范数据结构，明确单一事实来源（Single Source of Truth）
// 若历史字段存疑，触发 Stop-and-Clarify 协议向用户确认废弃旧字段
const userName = user.name;
const userId = payload.userId;
```

### ❌ 反模式 2：使用 `any` 或宽松类型逃避类型系统
```typescript
// BAD: 为了让兼容代码通过编译，随意使用 any 抹平类型
function handleEvent(event: any) {
  const targetId = event?.target?.id ?? (event as any)?.id;
  return targetId;
}
```
```typescript
// GOOD: 严格定义类型守卫或精确接口
interface AppEvent {
  target: { id: string };
}

function handleEvent(event: AppEvent): string {
  return event.target.id;
}
```

### ❌ 反模式 3：深层 if-else 嵌套与过度状态包装
```typescript
// BAD: 金字塔型嵌套，缺乏卫语句
function processOrder(order: Order | null) {
  if (order) {
    if (order.status === 'PAID') {
      if (order.items && order.items.length > 0) {
        return fulfill(order);
      } else {
        throw new Error('No items');
      }
    } else {
      return null;
    }
  }
  return null;
}
```
```typescript
// GOOD: 早期返回（Early Return / Guard Clauses）压平代码
function processOrder(order: Order | null) {
  if (!order || order.status !== 'PAID') return null;
  if (!order.items?.length) throw new Error('No items');
  return fulfill(order);
}
```

---

## 2. Python

### ❌ 反模式 1：万能异常捕获与静默吞错 (Silent Exception Swallowing)
```python
# BAD: 盲目 pass 吞掉所有异常，导致真正 bug（拼写错误、类型错误）极难排查
try:
    user_config = fetch_config()
    timeout = user_config.get('timeout')
except Exception:
    timeout = 30  # 即使 fetch_config 中有 SyntaxError 或网络错误也被掩盖
```
```python
# GOOD: 精确捕获预期异常，或明确让错误向上冒泡
try:
    user_config = fetch_config()
    timeout = user_config.get('timeout', 30)
except ConfigNotFoundError:
    logger.warning("Config not found, falling back to default timeout.")
    timeout = 30
```

### ❌ 反模式 2：无限嵌套的字典 `.get()` 回退链
```python
# BAD: 防御性过头，无休止地 get 与空字典回退
val = data.get('response', {}).get('result', {}).get('item', {}).get('val', None) or data.get('legacy_val')
```
```python
# GOOD: 结构化解析或 Pydantic / dataclass 数据校验；若兼容存疑则停步确认
# 确认后使用确定的字段路径
val = data['response']['result']['item']['val']
```

### ❌ 反模式 3：滥用 `getattr` / `hasattr` 模拟动态字段兼容
```python
# BAD: 掩盖字段弃用与模型重构
def get_user_email(user):
    if hasattr(user, 'primary_email'):
        return user.primary_email
    elif hasattr(user, 'email'):
        return user.email
    return getattr(user, 'contact_mail', '')
```
```python
# GOOD: 统一模型属性，清理旧字段引用
def get_user_email(user: User) -> str:
    return user.email
```

---

## 3. Go

### ❌ 反模式 1：忽略错误或以空变量丢弃 (Error Swallowing)
```go
// BAD: 忽略关键错误，自作主张当作空数据处理
data, _ := ioutil.ReadFile(filename)
_ = json.Unmarshal(data, &config)
```
```go
// GOOD: 显式处理错误，绝不静默掩盖
data, err := os.ReadFile(filename)
if err != nil {
    return fmt.Errorf("read file %s: %w", filename, err)
}
if err := json.Unmarshal(data, &config); err != nil {
    return fmt.Errorf("parse config: %w", err)
}
```

### ❌ 反模式 2：滥用 `interface{}` / `any` 绕过静态类型
```go
// BAD: 试图兼容各种传入类型，导致大量复杂的 runtime type switch
func Process(payload interface{}) string {
    switch v := payload.(type) {
    case string:
        return v
    case map[string]interface{}:
        return fmt.Sprint(v["name"])
    case *LegacyData:
        return v.OldName
    default:
        return ""
    }
}
```
```go
// GOOD: 明确输入契约，让调用方负责入参转换
func Process(item NamedItem) string {
    return item.Name()
}
```

### ❌ 反模式 3：缺乏卫语句导致的不必要嵌套
```go
// BAD: 嵌套过深
func (s *Service) Handle(req *Request) error {
    if req != nil {
        if req.IsValid() {
            if s.isReady {
                return s.execute(req)
            } else {
                return ErrNotReady
            }
        } else {
            return ErrInvalid
        }
    }
    return ErrNilRequest
}
```
```go
// GOOD: 早期返回压平逻辑
func (s *Service) Handle(req *Request) error {
    if req == nil {
        return ErrNilRequest
    }
    if !req.IsValid() {
        return ErrInvalid
    }
    if !s.isReady {
        return ErrNotReady
    }
    return s.execute(req)
}
```

---

## 4. Java / Kotlin

### ❌ 反模式 1：多层 Optional 级联与过量空判断
```java
// BAD: 把 Optional 当作多层兼容 fallback 链使用
String name = Optional.ofNullable(user)
    .map(User::getName)
    .orElseGet(() -> Optional.ofNullable(user)
        .map(User::getNickName)
        .orElseGet(() -> Optional.ofNullable(user)
            .map(User::getLegacyHandle)
            .orElse("Unknown")));
```
```java
// GOOD: 数据层统一规范，业务逻辑直截了当
String name = user.getName();
```

### ❌ 反模式 2：无意义的过度分层与冗余 DTO 互转
```java
// BAD: 仅为了兼容历史接口，写大量没有任何业务价值的包装器
public UserResponseDTO toLegacyDto(UserModern modern) {
    UserResponseDTO dto = new UserResponseDTO();
    dto.setUsername(modern.getName());
    dto.setUser_name(modern.getName());
    dto.setDisplayName(modern.getName());
    return dto;
}
```
```java
// GOOD: 明确废弃旧接口或使用标准序列化别名注解 (@JsonProperty / @JsonAlias)，而非手写无用转换代码
```

---

## 5. Rust

### ❌ 反模式 1：无休止的 `.unwrap_or_default()` 掩盖状态异常
```rust
// BAD: 无论遇到什么错误都静默降级为默认空值，埋下深层逻辑 bug
let config = parse_config(path).unwrap_or_default();
let user_id = find_user().map(|u| u.id).unwrap_or(0);
```
```rust
// GOOD: 显式匹配错误或使用 ? 操作符向上冒泡
let config = parse_config(path)?;
let user = find_user().ok_or(AppError::UserNotFound)?;
```

---

## 6. 通用设计原则总结

1. **唯一事实来源（Single Source of Truth）**：拒绝同一种数据有两套以上的兼容命名（如 `userId` 和 `user_id` 同时并存）。
2. **失败快于隐蔽（Fail Fast）**：数据格式不符合预期应尽早暴露或被检验层拦截，绝不在底层业务逻辑写一长串兜底。
3. **存疑停步（Stop & Ask）**：代码中看不懂为什么存在的历史 workaround，**坚决不自行揣测补丁**，停下来与开发者沟通是最快也是最没有技术债的手段。
