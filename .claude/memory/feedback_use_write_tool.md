---
name: Use Write tool for files
description: Always use Write/Edit tools for files, never cat/heredoc in Bash
type: feedback
---

Always use the Write or Edit tools when creating or modifying files. Never use `cat <<EOF >` or `echo >` redirects in Bash.

**Why:** Dedicated tools give the user a clear diff view and approval flow; shell redirects bypass that.

**How to apply:** Any time a file needs to be created or edited, reach for Write/Edit first. Only use Bash for commands that can't be done with dedicated tools (running builds, git operations, etc.).
