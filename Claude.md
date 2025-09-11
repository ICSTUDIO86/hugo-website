# Rules that MUST be followed for any project (Extremely Important!!!)

## Communication

- Always use Simplified Chinese for thinking and conversation

## Documentation

- When writing .md documents, also use Chinese
- Write formal documentation to the project's docs/ directory
- Write plans, proposals and other documents for discussion and review to the project's discuss/ directory

## Code Architecture

- Hard metrics for writing code, including the following principles:
  (1) For dynamic languages like Python, JavaScript, TypeScript, try to ensure each code file doesn't exceed 300 lines
  (2) For static languages like Java, Go, Rust, try to ensure each code file doesn't exceed 400 lines
  (3) Try to keep no more than 8 files per folder layer. If exceeded, plan for multi-layer subfolders
- Beyond hard metrics, always pay attention to elegant architectural design and avoid the following "code smells" that may erode our code quality:
  (1) Rigidity: The system is difficult to change, any minor modification triggers a chain of cascading changes.
  (2) Redundancy: The same code logic appears repeatedly in multiple places, making maintenance difficult and prone to inconsistencies.
  (3) Circular Dependency: Two or more modules are intertwined, forming an inseparable "deadlock" that makes testing and reuse difficult.
  (4) Fragility: A change in one part of the code causes unexpected breakage in other seemingly unrelated parts of the system.
  (5) Obscurity: Code intent is unclear, structure is chaotic, making it difficult for readers to understand its function and design.
  (6) Data Clump: Multiple data items always appear together in different method parameters, suggesting they should be combined into an independent object.
  (7) Needless Complexity: Using a "sledgehammer to crack a nut", over-engineering makes the system bloated and difficult to understand.
- [Very Important!!] Whether you're writing code yourself or reading/reviewing others' code, always strictly follow the above hard metrics and constantly pay attention to elegant architectural design.
- [Very Important!!] Whenever you identify "code smells" that may erode our code quality, immediately ask the user if optimization is needed and provide reasonable optimization suggestions.


## Run & Debug

- Must first maintain all .sh scripts needed for Run & Debug in the project's scripts/ directory
- For all Run & Debug operations, always use .sh scripts in the scripts/ directory for start/stop. Never directly use npm, pnpm, uv, python, etc. commands
- If .sh scripts fail to execute, whether it's the .sh script itself or other code issues, fix it urgently first. Then still insist on using .sh scripts for start/stop
- Before Run & Debug, configure Logger with File Output for all projects, with unified output to the logs/ directory

## Python

- Define data structures as strongly typed as possible. If you must use unstructured dict in specific scenarios, stop and ask for user consent first
- Python virtual environments always use .venv as the directory name
- Must use uv, not pip, poetry, conda, python3, python. Including dependency management, building, debug startup and all other aspects
- Keep the project root directory clean, only keeping files that must exist
- main.py content should also be concise. Only keep code that must exist

## React / Next.js / TypeScript / JavaScript

- Next.js must use v15.4, don't use v15.3 or v14 or lower versions anymore
- React must use v19, don't use v18 or lower versions anymore
- Tailwind CSS must use Tailwind CSS v4. Don't use v3 or lower versions anymore
- Strictly prohibit using commonjs module system
- Use TypeScript as much as possible. Only use JavaScript when build tools completely don't support TypeScript (like WeChat Mini Program main projects)
- Define data structures as strongly typed as possible. If you must use any or unstructured json in specific scenarios, stop and ask for user consent first