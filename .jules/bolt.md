# Bolt's Journal

## 2024-05-22 - Initial Setup
**Learning:** Performance optimization requires careful measurement and isolation of variables.
**Action:** Always create reproduction scripts before optimizing.

## 2024-05-22 - Cache Placement
**Learning:** Caching checks must be placed *before* any expensive operations (like file I/O), even if those operations are "backup" logic.
**Action:** Review control flow to ensure cache hits return as early as possible.
