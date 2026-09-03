#!/usr/bin/env python3
"""窥渊录 八窍替换补充：处理裸 key（金:）与属性访问（.金 / [\"金\"] 已由另一脚本处理）。

映射同 rename-elements.py。
"""
import os
import re
import sys

MAPPING = {
    "金": "烛", "木": "尸", "水": "星", "火": "渊",
    "土": "梦", "风": "噬", "雷": "帘", "冰": "疫",
}

# 裸 key：行首（可带缩进）的单字 + 冒号
KEY_RE = re.compile(r"(?m)^([ \t]*)([金木水火土风雷冰])(:)")

# 属性访问：.金  /  .火  形式（前面是字母数字或 ] 或 > 或空格等，后面是空白或非标识符）
DOT_RE = re.compile(r"(?m)(\.)([金木水火土风雷冰])(?![a-zA-Z0-9\u4e00-\u9fff])")

def process_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, OSError):
        return 0

    def key_repl(m):
        return m.group(1) + MAPPING[m.group(2)] + m.group(3)

    def dot_repl(m):
        return m.group(1) + MAPPING[m.group(2)]

    new = KEY_RE.sub(key_repl, content)
    new = DOT_RE.sub(dot_repl, new)

    changed = 1 if new != content else 0
    if changed:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(new)
    return changed

def main():
    total = 0
    for fp in sys.argv[1:]:
        if os.path.isfile(fp):
            if process_file(fp):
                total += 1
                print(f"  {fp}")
    print(f"\n修改 {total} 个文件")

if __name__ == "__main__":
    main()
