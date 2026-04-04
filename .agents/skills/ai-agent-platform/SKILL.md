```markdown
# ai-agent-platform Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill introduces the core development patterns and conventions used in the `ai-agent-platform` Python codebase. You'll learn about file naming, import/export styles, commit message conventions, and how to structure and run tests. This guide is designed to help contributors quickly align with the project's standards and streamline collaboration.

## Coding Conventions

### File Naming
- **Style:** camelCase
- **Example:**  
  ```plaintext
  agentManager.py
  taskHandler.py
  ```

### Import Style
- **Style:** Use aliases for imports.
- **Example:**
  ```python
  import numpy as np
  import pandas as pd
  ```

### Export Style
- **Style:** Default export (typical for Python, meaning the main class or function is exposed by default).
- **Example:**
  ```python
  # agentManager.py
  class AgentManager:
      pass
  ```

### Commit Messages
- **Type:** Conventional commits
- **Prefixes:** `feat`, `fix`
- **Example:**
  ```
  feat: add multi-agent coordination logic
  fix: resolve agent state sync issue
  ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature  
**Command:** `/feature-development`

1. Create a new branch from `main`.
2. Implement the feature using camelCase file naming and alias imports.
3. Write or update tests in files matching `*.test.*`.
4. Commit changes using the `feat:` prefix and a concise description.
5. Open a pull request for review.

### Bug Fixing
**Trigger:** When fixing a bug  
**Command:** `/bug-fix`

1. Create a new branch from `main`.
2. Locate and fix the bug, following coding conventions.
3. Update or add relevant tests.
4. Commit changes using the `fix:` prefix and a clear description.
5. Open a pull request referencing the issue (if applicable).

## Testing Patterns

- **Framework:** Unknown (not detected)
- **File Pattern:** Test files are named with the pattern `*.test.*` (e.g., `agentManager.test.py`).
- **Example:**
  ```python
  # agentManager.test.py
  import unittest
  from agentManager import AgentManager

  class TestAgentManager(unittest.TestCase):
      def test_initialization(self):
          manager = AgentManager()
          self.assertIsNotNone(manager)
  ```

## Commands
| Command               | Purpose                                 |
|-----------------------|-----------------------------------------|
| /feature-development  | Start a new feature implementation      |
| /bug-fix              | Begin the bug fixing workflow           |
```
