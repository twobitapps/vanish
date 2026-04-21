# Security Policy

Vanish is a privacy-focused application. We take security reports seriously.

## Reporting a vulnerability

Please do **not** open a public issue for security reports. Instead, email the
operator of the domain `hy.gl` with the details. If a contact email is not
listed publicly yet, open a GitHub security advisory on this repo and we will
respond there.

Include, where possible:
- A clear description of the issue and its impact.
- Step-by-step reproduction or a proof-of-concept.
- Relevant URLs, commits, or deployment versions.
- Your preferred attribution (or request for anonymity).

We aim to acknowledge reports within 72 hours and to remediate high-severity
issues within 14 days. Please give us a reasonable disclosure window before
publicly discussing the issue.

## Scope

In scope:
- Anything that could let a third party (operator, network observer, or
  attacker) recover plaintext or decryption keys of a note.
- Issues that weaken the end-to-end encryption model beyond what the
  `/security` page already documents.
- Injection, XSS, CSP-bypass, or supply-chain issues in this repository.
- Issues in deployed infrastructure configuration (cache, headers, CORS) that
  weaken the client-side encryption boundary.

Out of scope:
- Rate-limit abuse that doesn't leak content (we welcome the report, but it's
  not a security issue).
- Social-engineering attacks against end users.
- Issues in third-party dependencies without a working exploit against Vanish.
- UX quibbles.

## What we already document as expected behavior

Before reporting, please check `/security` on the live site. The following
are intentional and documented:

- Anyone with the link (and password, if set) can decrypt.
- Browser history, clipboards, and extensions can observe the plaintext
  locally — we cannot and do not claim to defend against a compromised
  client.
- The server receives ciphertext and standard web request metadata (IP,
  user-agent, timing) briefly.
- Losing the link — or the password — means the note cannot be recovered by
  anyone, including the operator.

## Cryptographic primitives

- AES-256-GCM for encryption (96-bit IV, 128-bit auth tag).
- PBKDF2-SHA256 @ 600,000 iterations for password derivation.
- HKDF-SHA256 for combining the URL key and the password-derived key.
- 256-bit random URL keys, 128-bit random salts, 96-bit random paste IDs,
  all from `crypto.getRandomValues`.
- HTTPS with HSTS preload on the serving edge.

If you believe any of these choices are incorrect, inadequately parameterized,
or incorrectly applied, please report it.
