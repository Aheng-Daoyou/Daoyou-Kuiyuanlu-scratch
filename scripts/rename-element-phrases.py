#!/usr/bin/env python3
"""窥渊录 八窍替换补充2：战斗显示层的「X系」「X属性」派生文案 → 八窍。

映射（原版元素 -> 八窍）：
金->烛, 木->尸, 水->星, 火->渊, 土->梦, 风->噬, 雷->帘, 冰->疫

只处理后缀为「系」「属性」的双字词（战斗UI显示层），
不动「X行/X之/X法」等叙事层文案（留待AI生成层处理）。
"""
import os
import sys

MAPPING = {
    "金": "烛", "木": "尸", "水": "星", "火": "渊",
    "土": "梦", "风": "噬", "雷": "帘", "冰": "疫",
}
SUFFIXES = ["系", "属性"]

def process_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, OSError):
        return 0

    new = content
    for old, new_char in MAPPING.items():
        for suffix in SUFFIXES:
            new = new.replace(old + suffix, new_char + suffix)

    if new != content:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(new)
        return 1
    return 0

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
