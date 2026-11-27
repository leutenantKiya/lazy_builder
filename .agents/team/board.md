# Task board

| ID | Title | Owner | Status | Branch | Notes |
|----|-------|-------|--------|--------|-------|
| T-001 | Design tokens, fonts, dark default | builder | done (689e1b4) | feat/google-oauth | foundation for T-002..T-004 |
| T-002 | Login page per §6.11 | builder | done (c97b75e) | feat/google-oauth | after T-001 |
| T-003 | Workspace chrome (sidebar, top bar, empty state, dialogs) | builder | done (65948f9) | feat/google-oauth | after T-002 |
| T-004 | Canvas + editor chrome | builder | review (373d41e, ad0dd9e) | feat/google-oauth | after T-003 |
| T-005 | Three.js login backdrop (§7) | builder | later | | needs owner OK on scope |

All four run in sequence on one branch: they share index.css and the checkout.
