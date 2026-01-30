## 2024-05-22 - Accessibility Gaps in Custom Components
**Learning:** Custom interactive components (like `NodePalette`) often rely on `div`s without semantic roles (`dialog`) and use icon-only buttons without `aria-label`.
**Action:** When working on existing UI components, always check for missing `role` attributes on containers and `aria-label` on icon buttons.
