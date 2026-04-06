---
name: init
description: Reads all documentation files in a given folder and returns a comprehensive project summary covering overview, key components, technical details, current status, and notable findings. Use when the user says "init", "/init", or asks to summarize, understand, or get oriented in a project from its docs.
arguments:
  - name: docs_path
    description: Path to the folder containing documentation files to review (e.g. @docs/ or @docs/backend/)
    required: true
---

Please carefully review all documentation files within $ARGUMENTS and provide a comprehensive summary of your understanding of the project. Your summary should include:

1. **Project Overview**: The main purpose and goals of the project
2. **Key Components**: The primary modules, systems, or features described in the documentation
3. **Technical Details**: Any relevant technologies, frameworks, or architectural decisions mentioned
4. **Current Status**: The apparent stage of development or completion based on the documentation
5. **Notable Findings**: Any important constraints, requirements, or open questions identified
