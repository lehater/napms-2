# Design

## Context
The prototype uses one static fixture and shared collection/detail views. Real request UI has independent API routes and credentials.

## Goals / Non-Goals
Goals: complete the linked simulation within the current shell. Non-goals: backend, authorization emulation, persistence, reconciliation or framework additions.

## Decisions
Use React context and a pure state transition for an overlay over the existing fixture, rather than mutating module maps. Resolve links from context in existing views. Keep exact typed AccessSubject references on simulated requests and rules; validate against fixture component roles and Need Interaction. Reuse the existing canonical static rule when subjects match, preserving its origin; derive additional provenance links from new immutable decisions. Add a second compatible deployment on the existing resource to exercise first-rule creation without duplicating the fixture. Use named selects and a separate explicit decision-mode checkbox. Decision facts live on request snapshots (AccessDecision ID, actor, timestamp, outcome), as in the current fixture.

## Risks / Trade-offs
Volatile state disappears on refresh → visible notice. Existing static rule could mask first-create bugs → browser tests cover both a fresh subject and reuse. Invalid selections → validate at transition boundary as well as show an error. No migration; rollback removes frontend changes.
