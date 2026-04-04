```markdown
# ai-agent-platform Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `ai-agent-platform` Python codebase. You'll learn how to structure files, write imports and exports, follow commit message conventions, and understand the project's approach to testing. While no specific automation workflows were detected, this guide provides practical commands and examples to help you contribute effectively.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `agentManager.py`, `taskRunner.py`

### Import Style
- Use **relative imports** within the package.
  - Example:
    ```python
    from .utils import parseConfig
    from .models.agent import Agent
    ```

### Export Style
- Use **named exports** (explicitly listing what is exported).
  - Example:
    ```python
    __all__ = ['AgentManager', 'TaskRunner']
    ```

### Commit Message Conventions
- Use **conventional commits** with the `fix` prefix for bug fixes.
- Keep commit messages concise (average 47 characters).
  - Example:
    ```
    fix: handle agent timeout edge case
    ```

## Workflows

### Code Contribution
**Trigger:** When adding or updating code in the repository  
**Command:** `/contribute-code`

1. Create a new branch for your feature or fix.
2. Use camelCase for new file names.
3. Use relative imports for internal modules.
4. Explicitly define exports with `__all__`.
5. Write clear, conventional commit messages (e.g., `fix: ...`).
6. Submit a pull request for review.

### Testing Code
**Trigger:** When verifying code changes  
**Command:** `/run-tests`

1. Write tests in files matching the `*.test.*` pattern.
2. Use the project's preferred (unknown) test framework.
3. Run tests locally before pushing changes.
4. Ensure all tests pass before submitting a pull request.

## Testing Patterns

- **Test File Naming:** Use `*.test.*` for test files.
  - Example: `agentManager.test.py`
- **Framework:** Not specified; check existing tests for patterns.
- **Location:** Tests are typically placed alongside the code they test.

Example test file:
```python
# agentManager.test.py

def test_agent_initialization():
    agent = AgentManager()
    assert agent.is_ready()
```

## Commands
| Command         | Purpose                                    |
|-----------------|--------------------------------------------|
| /contribute-code| Start the code contribution workflow        |
| /run-tests      | Run all tests in the repository            |
```