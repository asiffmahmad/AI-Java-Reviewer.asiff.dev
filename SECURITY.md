# Security Policy

## Supported Versions

Only the current major version is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an e-mail to security@ai-java-reviewer.local. All security vulnerabilities will be promptly addressed.

### Secret Handling
The AI Java Reviewer extension relies on user-provided API keys.
1. We **never** log these keys.
2. We **never** write them to disk in plaintext.
3. We strictly use the VS Code `SecretStorage` API to encrypt these keys in your OS keychain.
