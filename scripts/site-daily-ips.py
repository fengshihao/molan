#!/usr/bin/env python3
"""按天统计官网独立 IP。只打印人数和页面，不把 IP 写出来。

在腾讯云上，对 nginx 访问日志运行：

  python3 site-daily-ips.py /var/log/nginx/access.log

日志里要有 GET /m.gif。页面脚本会去请求这个静态图，访问记录因此留在服务器日志里。
"""

from __future__ import annotations

import re
import sys
from collections import defaultdict
from datetime import datetime

MONTHS = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}

LINE = re.compile(
    r"^(?P<ip>\S+) \S+ \S+ \[(?P<day>\d{2})/(?P<mon>[A-Za-z]{3})/(?P<year>\d{4}):"
    r"[^\]]+\] \"GET /m\.gif\?p=(?P<path>[^\" ]*)"
)


def summarize(lines: list[str]) -> list[tuple[str, int, int, list[tuple[str, int]]]]:
    by_day_ips: dict[str, set[str]] = defaultdict(set)
    by_day_hits: dict[str, int] = defaultdict(int)
    by_day_paths: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    for line in lines:
        match = LINE.match(line)
        if not match:
            continue
        month = MONTHS.get(match.group("mon"))
        if not month:
            continue
        day = datetime(int(match.group("year")), month, int(match.group("day"))).date().isoformat()
        ip = match.group("ip")
        path = unescape(match.group("path")) or "/"
        by_day_ips[day].add(ip)
        by_day_hits[day] += 1
        by_day_paths[day][path].add(ip)
    rows = []
    for day in sorted(by_day_ips):
        paths = sorted(by_day_paths[day].items(), key=lambda item: (-len(item[1]), item[0]))
        rows.append((day, len(by_day_ips[day]), by_day_hits[day], [(path, len(ips)) for path, ips in paths]))
    return rows


def unescape(value: str) -> str:
    out = []
    i = 0
    while i < len(value):
        if value[i] == "%" and i + 2 < len(value):
            try:
                out.append(chr(int(value[i + 1 : i + 3], 16)))
                i += 3
                continue
            except ValueError:
                pass
        out.append(value[i])
        i += 1
    return "".join(out)


def format_rows(rows: list[tuple[str, int, int, list[tuple[str, int]]]]) -> str:
    lines = ["日期        独立IP  次数"]
    for day, unique, hits, paths in rows:
        lines.append(f"{day}  {unique:6d}  {hits:4d}")
        for path, count in paths:
            lines.append(f"  {path}  {count}")
    return "\n".join(lines)


def self_test() -> None:
    sample = [
        '1.1.1.1 - - [02/Nov/2026:08:01:00 +0800] "GET /m.gif?p=%2F HTTP/1.1" 200 35',
        '1.1.1.1 - - [02/Nov/2026:08:02:00 +0800] "GET /m.gif?p=%2Fdocs%2F HTTP/1.1" 200 35',
        '2.2.2.2 - - [02/Nov/2026:09:00:00 +0800] "GET /m.gif?p=%2F HTTP/1.1" 200 35',
        '3.3.3.3 - - [01/Nov/2026:09:00:00 +0800] "GET /index.html HTTP/1.1" 200 100',
        '3.3.3.3 - - [01/Nov/2026:09:00:00 +0800] "GET /m.gif?p=%2F HTTP/1.1" 200 35',
    ]
    rows = summarize(sample)
    assert [(row[0], row[1], row[2]) for row in rows] == [("2026-11-01", 1, 1), ("2026-11-02", 2, 3)]
    assert rows[1][3] == [("/", 2), ("/docs/", 1)]
    assert "1.1.1.1" not in format_rows(rows)


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == "--self-test":
        self_test()
        print("ok")
        return 0
    if len(sys.argv) < 2:
        print("用法: python3 site-daily-ips.py /var/log/nginx/access.log", file=sys.stderr)
        return 1
    lines: list[str] = []
    for path in sys.argv[1:]:
        with open(path, encoding="utf-8", errors="replace") as handle:
            lines.extend(handle)
    print(format_rows(summarize(lines)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
