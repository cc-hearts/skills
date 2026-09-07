#!/usr/bin/env bash
# ==============================================================================
# Universal Skills Installer
# 支持一键挂载到 OpenAI Codex, Claude Code, Antigravity/Gemini, Cursor 等开发环境
# ==============================================================================

set -e

# 获取当前仓库根目录（确保不论在何处调用都能准确定位）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

DRY_RUN=false
PROJECT_PATH=""

# 解析参数
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --project)
      PROJECT_PATH="$2"
      shift 2
      ;;
    -h|--help)
      echo "用法: ./scripts/install-all.sh [选项]"
      echo ""
      echo "选项:"
      echo "  --dry-run             仅预览将执行的挂载操作，不实际写入系统目录"
      echo "  --project <path>      额外将技能与 Cursor 规则注入到指定的具体项目目录"
      echo "  -h, --help            显示帮助信息"
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}       🚀 Agent Skills 全平台通用挂载脚本             ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "技能库源码目录: ${YELLOW}$REPO_ROOT${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}[DRY RUN 模式 - 仅预览操作，不进行实际写入]${NC}"
fi
echo ""

# 统计可用的 skills 目录
SKILLS=()
for item in "$REPO_ROOT"/*/; do
  skill_name=$(basename "$item")
  # 排除隐藏目录、scripts 等非技能目录
  if [[ "$skill_name" != ".git" && "$skill_name" != "scripts" ]]; then
    if [[ -f "$item/SKILL.md" ]]; then
      SKILLS+=("$skill_name")
    fi
  fi
done

if [[ ${#SKILLS[@]} -eq 0 ]]; then
  echo -e "${RED}❌ 未检测到任何带有 SKILL.md 的技能目录！${NC}"
  exit 1
fi

echo -e "已发现以下 ${#SKILLS[@]} 个可用技能："
for s in "${SKILLS[@]}"; do
  echo -e "  - ${GREEN}$s${NC}"
done
echo ""

install_to_dir() {
  local target_dir="$1"
  local platform_name="$2"

  echo -e "${BLUE}📦 挂载到 $platform_name ($target_dir)...${NC}"
  if [ "$DRY_RUN" = false ]; then
    mkdir -p "$target_dir"
  fi
  for s in "${SKILLS[@]}"; do
    if [ "$DRY_RUN" = true ]; then
      echo -e "  [DRY-RUN] ln -sfn \"$REPO_ROOT/$s\" \"$target_dir/$s\""
    else
      ln -sfn "$REPO_ROOT/$s" "$target_dir/$s"
      echo -e "  ✓ 已挂载: $s"
    fi
  done
  echo -e "${GREEN}✓ $platform_name 挂载就绪！${NC}\n"
}

# 1. Codex CLI
install_to_dir "$HOME/.codex/skills" "OpenAI Codex CLI"

# 2. Claude Code
install_to_dir "$HOME/.claude/skills" "Claude Code"

# 3. Antigravity / Gemini CLI
install_to_dir "$HOME/.gemini/config/skills" "Antigravity / Gemini CLI"

# 4. 如果提供了项目路径参数，如 ./install-all.sh --project /path/to/my-repo
if [[ -n "$PROJECT_PATH" ]]; then
  if [[ -d "$PROJECT_PATH" ]]; then
    echo -e "${BLUE}📁 检测到单项目挂载请求: $PROJECT_PATH${NC}"
    
    # 挂载到项目级 .agents/skills
    install_to_dir "$PROJECT_PATH/.agents/skills" "Project Local Skills (.agents/skills)"
    
    # 若存在 cursor 规则文件，同步导出到 .cursor/rules
    CURSOR_RULES_DIR="$PROJECT_PATH/.cursor/rules"
    if [ "$DRY_RUN" = false ]; then
      mkdir -p "$CURSOR_RULES_DIR"
    fi
    for s in "${SKILLS[@]}"; do
      if [[ -f "$REPO_ROOT/$s/rules/cursor.mdc" ]]; then
        if [ "$DRY_RUN" = true ]; then
          echo -e "  [DRY-RUN] ln -sfn \"$REPO_ROOT/$s/rules/cursor.mdc\" \"$CURSOR_RULES_DIR/$s.mdc\""
        else
          ln -sfn "$REPO_ROOT/$s/rules/cursor.mdc" "$CURSOR_RULES_DIR/$s.mdc"
          echo -e "  ✓ Cursor 规则已导出: $s.mdc -> .cursor/rules/$s.mdc"
        fi
      fi
    done
    echo -e "${GREEN}✓ 单项目配置注入完成！${NC}\n"
  else
    echo -e "${YELLOW}⚠️ 警告：指定的项目路径不存在: $PROJECT_PATH${NC}\n"
  fi
fi

echo -e "${GREEN}🎉 全平台准备完毕！${NC}"
echo -e "调用提示："
echo -e "  - Codex: \$<skill-name> (例如 \$code-simplifier)"
echo -e "  - Claude Code / Antigravity: 自然语言或输入技能名"
echo -e "  - Cursor: 在项目根目录执行 ./scripts/install-all.sh --project . 即刻启用 .cursor/rules"
