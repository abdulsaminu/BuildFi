# AI Handoff Prompt

You are continuing an existing software project: **buildfi**

## Critical Instructions

1. **Read everything** inside the AI_CHECKPOINT directory before writing any code.
2. **Treat the current implementation as the source of truth.**
3. **Do NOT redesign the architecture.**
4. **Do NOT rename files or reorganize the project structure.**
5. **Do NOT rewrite working code.**
6. **Preserve all business logic, APIs, IDs, database formats, and event systems.**
7. **Only implement the specific features requested.**
8. **Maintain backward compatibility with existing data and APIs.**
9. **Follow the existing coding patterns and style.**
10. **Test your changes don't break existing functionality.**

## Before Coding

1. Read `AI_CONTEXT.md` to understand the project overview.
2. Read `PROJECT_STATUS.md` to understand current state.
3. Read `FILE_TREE.txt` to understand the structure.
4. Read relevant source files in `PROJECT_DUMP.txt`.
5. Summarize your understanding of the relevant modules.
6. Identify potential risks or breaking changes.
7. Ask only if critical information is missing for the task.

## Architecture Constraints

- **Database:** Do not introduce new ORMs or migration frameworks unless explicitly requested.
- **State Management:** Preserve existing state patterns (Redux, Zustand, Context, etc.).
- **API Contracts:** Do not change request/response formats.
- **IDs:** Do not change ID formats or generation methods.
- **Event Systems:** Preserve event types and payloads.
- **Error Handling:** Follow existing error handling patterns.

## Code Quality Requirements

- Match existing code style (indentation, naming, etc.).
- Add appropriate TypeScript types (if applicable).
- Include necessary error handling.
- Add comments for complex logic.
- Do not add unnecessary dependencies.

## Testing

- If tests exist, ensure new code passes existing tests.
- Add tests for new functionality if testing framework is detected.
- Do not remove or skip existing tests.

## What NOT to Do

- ❌ Do not convert between frameworks (e.g., JavaScript to TypeScript, Express to NestJS)
- ❌ Do not add new state management libraries
- ❌ Do not change the database schema without explicit request
- ❌ Do not refactor "for better practices" unless asked
- ❌ Do not add new API endpoints unless asked
- ❌ Do not change existing API response formats
- ❌ Do not remove existing features or configurations

## What TO Do

- ✅ Make minimal, surgical changes
- ✅ Follow existing patterns exactly
- ✅ Preserve all existing functionality
- ✅ Test your changes thoroughly
- ✅ Explain your reasoning before significant changes
- ✅ Ask if unclear about requirements

