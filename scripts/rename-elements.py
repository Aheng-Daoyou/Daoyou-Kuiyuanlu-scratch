#!/usr/bin/env python3
"""窥渊录 八窍替换：元素单字（带引号字面量）→ 八窍单字。

映射（原版元素 -> 八窍）：
金 -> 烛, 木 -> 尸, 水 -> 星, 火 -> 渊, 土 -> 梦, 风 -> 噬, 雷 -> 帘, 冰 -> 疫

安全策略：只替换「带引号的单字字面量」（'金' / "金" / `金`），
绝不替换普通中文词里的字（如"金属""开水""土地"）。
"""
import os
import re
import sys

MAPPING = {
    "金": "烛",
    "木": "尸",
    "水": "星",
    "火": "渊",
    "土": "梦",
    "风": "噬",
    "雷": "帘",
    "冰": "疫",
}

# 匹配三种引号包裹的单字：'金' "金" `金`
# 三个独立正则，分别处理单引号/双引号/反引号，避免命名组重复
REGEXES = [
    re.compile("'(?P<c>[金木水火土风雷冰])'"),
    re.compile('"(?P<c>[金木水火土风雷冰])"'),
    re.compile("`(?P<c>[金木水火土风雷冰])`"),
]

def replace_element(match):
    old = match.group("c")
    quote = match.group(0)[0]
    return quote + MAPPING[old] + quote

def apply_all(content):
    for regex in REGEXES:
        content = regex.sub(replace_element, content)
    return content

def process_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, OSError):
        return 0

    new_content = apply_all(content)
    count = 0
    for old in MAPPING:
        # 粗略统计替换量（以带引号单字为基准）
        pass
    # 计算实际变化量：比较新旧
    old_count = len(content)
    # 简单估算：统计新内容里八窍单字数量
    for new in MAPPING.values():
        count += new_content.count("'" + new + "'") + new_content.count('"' + new + '"') + new_content.count('`' + new + '`')
    if new_content != content:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(new_content)
    return count

def main():
    files = sys.argv[1:]
    total = 0
    for fp in files:
        if os.path.isfile(fp):
            c = process_file(fp)
            total += c
            if c:
                print(f"  {fp}: {c} 处")
    print(f"\n共替换 {total} 处")

if __name__ == "__main__":
    main()
