# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 3.4.x   | :white_check_mark: |
| < 3.4   | :x: |

## Reporting a Vulnerability

Please **do not** open a public issue for security problems.

Send a private report to **locnt@locnguyendata.com** with:

- Affected version / commit
- Steps to reproduce
- Impact assessment (what an attacker could do)
- Any proof-of-concept, logs or screenshots

You can expect an initial acknowledgement within **72 hours** and a status
update within **7 days**. Confirmed issues are fixed on the latest minor line
and disclosed in `CHANGELOG.md` once a patched release is available.

## Scope

In scope: authentication and session handling, RBAC/tenant isolation, secret
storage and encryption, file upload and media handling, SSRF/XXE/command
injection vectors, and the AGPL §13 source-offer endpoint.

Out of scope: vulnerabilities in third-party services (Zalo, Telegram, S3/R2
providers), social engineering, and issues that require a already-compromised
server or database.

## Legal notice

ZaloCRM is distributed under **GNU AGPL-3.0** (see `LICENSE` and `NOTICE`).
Security research must respect the license terms, including the attribution
requirements in `NOTICE` and the network source-offer obligation in §13.
