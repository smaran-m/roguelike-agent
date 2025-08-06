  I have a series of development tasks in markdown files under /docs/tasks/. Please work through them      
  autonomously with the following workflow:

  **For each task file in /docs/tasks/:**
  1. Read and understand the task requirements
  2. Create a comprehensive todo list using TodoWrite
  3. Implement the feature following existing code patterns
  4. Run `npm run dev` and verify functionality works
  5. Run `npm run test` and fix any test failures
  6. Run `npm run typecheck` and fix any type errors
  7. Create a git commit with format: "feat: [task-name] - [brief description]"
  8. Mark task as complete and move to next task

  **Requirements:**
  - Follow the existing architecture patterns in CLAUDE.md
  - Maintain all existing tests passing
  - Update test count in CLAUDE.md when adding/removing tests
  - Use proper TypeScript types throughout
  - Follow the established error handling and logging patterns
  - Create feature commits, not implementation-detail commits
  - Work through tasks sequentially until all are complete

  **Output:** Provide a summary after each completed task showing what was implemented and the commit hash.

  Start by reading all task files in /docs/tasks/ to understand the full scope, then begin implementation.