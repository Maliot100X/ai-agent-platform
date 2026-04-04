```markdown
# ai-agent-platform Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the development patterns and conventions used in the `ai-agent-platform` TypeScript repository. You'll learn how to structure files, write imports/exports, follow commit message conventions, and organize tests, enabling you to contribute code that aligns with the project's standards.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `agentManager.ts`, `userProfileService.ts`

### Import Style
- Use **alias imports** for modules.
  - Example:
    ```typescript
    import { Agent } from '@models/agent';
    import { startSession } from '@services/sessionManager';
    ```

### Export Style
- Use a **mixed export style** (both named and default exports may be present).
  - Named export:
    ```typescript
    export function createAgent() { ... }
    ```
  - Default export:
    ```typescript
    export default AgentManager;
    ```

### Commit Messages
- Follow the **Conventional Commits** style.
- Use the `feat` prefix for new features.
- Commit messages are descriptive, averaging 116 characters.
  - Example:  
    ```
    feat: add agent session management with persistent storage and error handling
    ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature to the platform  
**Command:** `/feature-development`

1. Create a new file using camelCase naming.
2. Use alias imports for dependencies.
3. Export your module/function using named or default export as appropriate.
4. Write a descriptive commit message starting with `feat:`.
5. Add or update tests in corresponding `*.test.*` files.

### Testing
**Trigger:** When writing or running tests  
**Command:** `/run-tests`

1. Create or update test files matching the `*.test.*` pattern.
2. Write tests using the project's (unspecified) testing framework.
3. Run the test suite to ensure all tests pass.

## Testing Patterns

- Test files are named using the `*.test.*` pattern (e.g., `agentManager.test.ts`).
- The specific testing framework is not detected, but follow common TypeScript testing practices:
  ```typescript
  describe('AgentManager', () => {
    it('should create a new agent', () => {
      // test logic here
    });
  });
  ```

## Commands
| Command              | Purpose                                   |
|----------------------|-------------------------------------------|
| /feature-development | Start a new feature using project patterns|
| /run-tests           | Run the test suite                        |
```
