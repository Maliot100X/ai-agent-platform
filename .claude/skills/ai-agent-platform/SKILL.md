```markdown
# ai-agent-platform Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill introduces the core development patterns and conventions used in the `ai-agent-platform` Python codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns. While no specific frameworks or automated workflows were detected, this guide will help you write, organize, and test code in a consistent manner within this repository.

## Coding Conventions

### File Naming
- **Convention:** Use `camelCase` for Python file names.
  - **Example:**  
    ```plaintext
    agentManager.py
    taskQueue.py
    ```

### Import Style
- **Convention:** Use aliasing when importing modules.
  - **Example:**
    ```python
    import numpy as np
    import pandas as pd
    from utils import helperFunctions as hf
    ```

### Export Style
- **Convention:** Mixed export styles are used (both explicit and implicit).
  - **Example:**
    ```python
    # Explicit export
    __all__ = ['Agent', 'TaskQueue']

    # Implicit export (by defining classes/functions)
    class Agent:
        ...
    ```

### Commit Messages
- **Convention:** Use [Conventional Commits](https://www.conventionalcommits.org/) with the `feat` prefix for new features.
  - **Example:**
    ```
    feat: add support for multi-agent coordination in agentManager.py
    ```

## Workflows

### Adding a New Feature
**Trigger:** When implementing a new capability or module.
**Command:** `/add-feature`

1. Create a new Python file using camelCase (e.g., `newFeature.py`).
2. Write your code, using alias imports where appropriate.
3. Export your main classes/functions using explicit or implicit exports.
4. Write corresponding tests in a file matching `*.test.*` (e.g., `newFeature.test.py`).
5. Commit your changes with a conventional commit message prefixed by `feat`.
6. Push your branch and open a pull request.

### Writing and Running Tests
**Trigger:** When verifying functionality or before merging code.
**Command:** `/run-tests`

1. Create or update test files with the pattern `*.test.*` (e.g., `agentManager.test.py`).
2. Write test cases for your modules and functions.
3. Run your tests using your preferred Python test runner (e.g., `pytest`, `unittest`).
4. Ensure all tests pass before merging.

## Testing Patterns

- **Test File Pattern:** Test files should match `*.test.*` (e.g., `module.test.py`).
- **Framework:** No specific testing framework detected; use your preferred Python testing tool.
- **Example:**
  ```python
  # agentManager.test.py
  import unittest
  from agentManager import Agent

  class TestAgent(unittest.TestCase):
      def test_agent_creation(self):
          agent = Agent("Test")
          self.assertEqual(agent.name, "Test")
  ```

## Commands
| Command       | Purpose                                      |
|---------------|----------------------------------------------|
| /add-feature  | Start the process for adding a new feature   |
| /run-tests    | Run all test files in the repository         |
```
