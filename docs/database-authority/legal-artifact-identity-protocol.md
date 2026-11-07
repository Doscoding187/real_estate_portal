# Protected legal release artifact identity

**Status: implementation proposal; production protected operations remain
refused until a public signing key is approved and pinned.**

The ACA-injected CONTAINER_APP_* values describe a deployed job, not a clean
Git checkout. Legal plan/apply/verify therefore use a signed artifact identity
instead of treating an environment marker or image label as source proof.
legalArtifactIdentityTrustRoots.ts intentionally contains no key yet. Until a
separate reviewed change pins a public key there, protected commands fail
closed.

## Signed envelope

The signer creates a detached JSON envelope at run time. Its strict claims bind:

- operation: legal-release-plan, legal-release-apply, or
  legal-release-verify;
- full 40-character source Git SHA;
- the pushed API image's sha256: OCI manifest digest;
- migration manifest digest and canonical model inventory digest;
- canonical JSON digest of the exact legal packet;
- exact protected database target fingerprint;
- exact Container Apps job ARM resource ID;
- operation plan digest for apply; and
- issue/expiry times, with a maximum 30-minute validity window.

Ed25519 signs the canonical JSON claims. The job receives the detached envelope
and the separately supplied legal packet as read-only runtime files. The
packet is never baked into the image. The envelope contains no database
credential. The migration credential remains a separately scoped job secret
reference used only for apply.

## Trust and measurement

Edward generates the Ed25519 key pair on his own machine. The private key is
stored at `~/.config/property-listify/legal-artifact-signing/private.pem` with
owner-only directory and file permissions, and stays there. It is never sent
to Azure, committed, baked into an image, placed in a job environment, logged,
or pasted into chat. Edward can create it locally with:

```sh
umask 077
install -d -m 700 "$HOME/.config/property-listify/legal-artifact-signing"
openssl genpkey -algorithm Ed25519 \
  -out "$HOME/.config/property-listify/legal-artifact-signing/private.pem"
chmod 600 "$HOME/.config/property-listify/legal-artifact-signing/private.pem"
openssl pkey \
  -in "$HOME/.config/property-listify/legal-artifact-signing/private.pem" \
  -pubout \
  -out "$HOME/.config/property-listify/legal-artifact-signing/public.pem"
```

Only the public file is eligible for review. A separate reviewed PR adds the
public key and key ID to `legalArtifactIdentityTrustRoots.ts`; this PR leaves
the trust-root map empty. The private file stays on Edward's machine while he
signs a detached, short-lived envelope after independently checking the source
revision, image digest/provenance, manifest/model digests, packet, target, and
operation. The signing command must not print the private key or include it in
the envelope.

Before opening the database connection, the protected CLI:

1. verifies the Ed25519 signature against the pinned key and checks expiry;
2. matches the operation, target, packet digest, source SHA, manifest digest,
   model digest, and apply plan digest;
3. uses the ACA local managed-identity endpoint to obtain a read-only ARM
   token without logging the endpoint header or token;
4. reads the exact signed job resource and its active execution through ARM;
5. requires the ARM job's system-assigned principal ID to match the token's
   principal ID; and
6. compares the active execution's digest-pinned image with the signed OCI
   digest.

The Azure job name/execution/replica environment markers only select the
resource to inspect. They do not prove source, packet, or image identity.
BUILD_SHA, GITHUB_SHA, image labels, and environment values are not accepted
as identity evidence.

The trusted release process must obtain the source SHA from the reviewed Git
checkout and a verified build provenance record, the image digest from the ACR
manifest after push, manifest/model digests from that checkout, and the packet
digest from the exact packet supplied at run time. Edward signs only after
those values and the operation have been checked. A hand-entered environment
value or OCI label is insufficient.

The job's system-assigned identity needs read-only ARM access scoped to that
job resource so it can inspect the job and active execution. No such role
assignment is created by this PR. Failure to obtain a token or read either
resource refuses the operation before a database connection is opened.

## What this prevents and what it cannot prevent

- Changing only BUILD_SHA, GITHUB_SHA, an ACA marker, or an OCI label cannot
  satisfy signature and ARM image-digest checks.
- Replacing the packet, migration manifest, model inventory, target,
  operation, or plan digest makes the signed values disagree and is refused.
- Changing the job image to a different digest makes the execution-template
  check fail, even if the job's current definition was changed after execution
  began.
- A compromised signing key or signer could authorize a malicious packet or
  image. The signer must verify trusted GitHub build provenance and the
  reviewed legal packet; it must not sign claims copied from environment
  variables.
- A principal allowed to start a protected job may be able to use its secret
  references. Future Azure permissions for Microsoft.App/jobs/start/action
  must be tightly scoped and reviewed.
- The public key has not been selected or pinned. This change is fail-closed
  until that trust anchor is established in its own reviewed step.

The signature does not replace the existing database target acknowledgement,
legal approval checks, schema congruency check, lock, transaction, or exact
plan digest.

## Test coverage

The focused identity tests use ephemeral keys and synthetic packets only. They
prove rejection when each required claim is missing, the key ID is not pinned,
the signature is missing or changed, or any binding differs: format/purpose,
operation, source SHA, image digest, manifest digest, model digest, packet
digest, apply plan digest, target fingerprint, job resource ID, issue/expiry
window, active execution image, job/execution markers, and managed identity
principal. A different BUILD_SHA label alone does not change acceptance.

Azure's managed identity endpoint and Container Apps job/execution ARM shapes
are read through the documented platform endpoint and Microsoft.App/jobs
execution resources. No Azure resource is modified by this protocol.
