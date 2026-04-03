```markdown
# ai-agent-platform Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `ai-agent-platform` Python codebase. You'll learn how to structure files, write imports and exports, follow commit message standards, and organize tests. This guide also provides suggested commands for common workflows to streamline your development process.

## Coding Conventions

### File Naming
- Use **snake_case** for all file and module names.
  - Example: `agent_manager.py`, `data_loader.py`

### Import Style
- Use **alias imports** to clarify module usage and avoid naming conflicts.
  - Example:
    ```python
    import numpy as np
    import pandas as pd
    ```

### Export Style
- Use **default exports** (i.e., define main classes or functions without explicit `__all__`).
  - Example:
    ```python
    class AgentManager:
        ...
    ```

### Commit Messages
- Follow the **Conventional Commits** style.
- Use the `feat` prefix for new features.
- Keep commit messages concise (average 48 characters).
  - Example:
    ```
    feat: add agent registration endpoint
    ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature to the platform  
**Command:** `/feature-dev`

1. Create a new branch for your feature.
2. Implement the feature in a new or existing snake_case file.
3. Use alias imports as needed.
4. Write or update tests in a corresponding `*.test.*` file.
5. Commit changes with a `feat:` prefix and a concise message.
6. Open a pull request for review.

### Testing
**Trigger:** When validating your code changes  
**Command:** `/run-tests`

1. Identify or create test files matching the `*.test.*` pattern.
2. Run all test files using your preferred Python test runner.
3. Ensure all tests pass before merging.

## Testing Patterns

- Test files follow the `*.test.*` naming pattern (e.g., `agent_manager.test.py`).
- The specific testing framework is not detected, so use standard Python testing tools (e.g., `unittest`, `pytest`).
- Place tests alongside or in a dedicated test directory as appropriate.

  Example test file:
  ```python
  # agent_manager.test.py
  import unittest
  from agent_manager import AgentManager

  class TestAgentManager(unittest.TestCase):
      def test_registration(self):
          manager = AgentManager()
          self.assertTrue(manager.register('agent1'))
  ```

## Commands
| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /feature-dev   | Start a new feature development workflow      |
| /run-tests     | Run all tests in the codebase                |
```
