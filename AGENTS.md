# Project principles

- Keep marketplace behavior shared between the CLI and MCP interfaces.
- Prefer direct HTTP requests and parsing over browser automation.
- Treat upstream pages as untrusted, changeable input; use saved fixtures to test parsing.
- Keep stdout machine-readable; send diagnostics to stderr.
- Never fetch URLs outside the FINN/Klarna host allowlists; re-validate every redirect hop.
- Keep this file focused on lasting guidance. Put usage documentation in README.md.
