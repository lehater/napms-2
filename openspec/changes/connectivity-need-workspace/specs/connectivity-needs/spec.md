# ConnectivityNeed in the REAL workspace

## Purpose

Let a user find a saved business need across processes, identify its participants, and use it as the basis for an explicitly confirmed access request.

## ADDED Requirements

### Requirement: One registry row per visible Need

The REAL Sidebar SHALL offer «Потребности» under «Бизнес-контекст». Its bounded registry and each Process's Needs tab SHALL link each visible Need ID to the same detail. Both lists SHALL show factual names, communication direction and lifecycle status, including historical records. Related links SHALL use real identities.

#### Scenario: Reuse across processes and revisions

- **WHEN** two processes have distinct Needs for the same Interaction with several revisions
- **THEN** the registry shows two rows, each process shows only its own row, and returning from detail restores the originating list and page.

#### Scenario: Disclosure before pagination

- **WHEN** a caller reads the registry
- **THEN** the server applies the same actor, business scope and shared-read rules as the process-scoped list before paging or computing hasMore. Unauthorized reads disclose no identities, labels or counts.

### Requirement: Separate creation by Interaction

The UI SHALL offer a distinct creation form from the registry and from an active Process. A user SHALL be able to choose one eligible Interaction, narrow candidates by Application and see the derived source participant. Saving SHALL require a nonblank businessBasis of at most 10,000 characters and navigate to the returned Need. Cancelling SHALL return to the origin without writing.

#### Scenario: Multiple revisions of one directed pair

- **WHEN** a Process has no Need for an eligible Interaction with several published revisions
- **THEN** all pages of choices together contain one entry for that Interaction. The server derives its source Component and saves only the stable Process/Interaction/Component tuple and basis. Creating from Process preselects that Process.

#### Scenario: Conflict or invalid input

- **WHEN** an authorized submission repeats a tuple, including one reserved by a RETIRED or aliased historical Need, targets an ARCHIVED Process, or supplies an invalid basis
- **THEN** the corresponding duplicate, archived or basis error is shown, no Need or Request is inserted and any link to an existing Need requires visibility of that record.

#### Scenario: Legacy client and independent authority

- **WHEN** a caller posts the existing Revision selector and basis, or uses the new Interaction selector and basis
- **THEN** the server enforces the same transactional eligibility, uniqueness and write grants. Either selector alone is supported. Both together, neither, or client-supplied participants are rejected with 422.

### Requirement: Addressable Need overview, communication and history

Need detail SHALL present the Process, basis and Need status on Overview, the directed communication and participant relations on «Коммуникация», and authorized paged Request history on «Заявки». Basis editing and lifecycle actions SHALL preserve the accepted identity, permissions and history. The existing Process-scoped deep link and Requests tab URL SHALL continue to resolve after reload.

#### Scenario: Archived Process or retired Need

- **WHEN** the actor opens an inactive context
- **THEN** detail explains the blocking status and offers authorized history. New Requests are blocked, a retired Need can only be restored under an active Process, and past Requests, Decisions and Rules retain their exact references.

### Requirement: Explicit composition with an exact published revision

An action on an active Need of an active Process SHALL open a separate composition screen. It SHALL initially propose the visible compatible published Revision with the highest revisionNumber across all pages. The user SHALL be able to choose any other eligible published Revision and its deployments, inspect all traffic clauses, and explicitly confirm the existing four-reference Request.

#### Scenario: Newer revision beyond the first legacy options page

- **WHEN** an actor opens composition and more than one page of compatible revisions exists
- **THEN** the initial selection is the greatest eligible revisionNumber. Choosing an earlier version clears the deployments and confirmation. Submission stores exactly the chosen revision. Publishing a newer version leaves existing Requests and Rules intact.

#### Scenario: No eligible pair, cancellation or authority change

- **WHEN** there are no visible compatible deployment pairs, the user cancels, or changes actor before confirming
- **THEN** the UI submits nothing, clears obsolete choices and discloses no hidden options. On cancellation the user returns to the same Need. Direct submission remains subject to the existing server-side admission rules.
