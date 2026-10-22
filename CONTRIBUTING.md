# Contributing

Start from [the documentation map](README.md). One document owns each concept; link to it instead of copying its rules elsewhere.

Use a focused branch and PR. Describe the problem, resulting behavior, confirmed versus proposed choices, and validation. Explain tradeoffs so someone learning the codebase can follow the reasoning. Changing an accepted flow requires an explicit product decision, not an incidental diagram edit.

For documentation changes:

1. Check relative links and anchors resolve; verify technical claims against official sources.
2. Render changed Mermaid diagrams and compare labels, branches, and loops with the prose.
3. Trace affected requirements to acceptance criteria and roadmap milestones.
4. Inspect the entire diff for unintended files, secrets, implementation claims, and duplicated rules.

For future implementation, add setup/test commands only after they work. Verify authorization with multiple users across multiple projects, including direct requests and exports. Keep schema changes in reviewed migrations and test them in an isolated environment before production. A successful build is not proof of a deployed user journey.

The initial default branch contains an empty baseline commit solely to make the first documentation PR possible. Documentation belongs on the PR branch; it is not an application release.
