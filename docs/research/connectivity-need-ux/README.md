# REAL ConnectivityNeed UX audit — #140

**Review:** local REAL FastAPI + SQLite + Chromium, 1920 × 1080. **Runtime source:** `main` at `c71c16edd698a6ec5f800c879d64ce7869107f0c`. The browser session started from `631da89`; the intervening changes to `main` were three unrelated engineering documents, so the REAL app/runtime code was identical. **Data:** disposable `/tmp` SQLite initialized with the repository's `init-demo`, then changed through the supported UI/API using synthetic names and IDs. The run used generated local-demo credentials. The evidence contains only demo business data.

## Confirmed findings

| Priority | Finding | Evidence |
| --- | --- | --- |
| **P1** | Need creation presents two options for the same Interaction when it has two published Revisions: `tcp(443)` and `tcp(1024-2047→8443); udp(53)`. A Need is identified by its Process/Interaction/participant; the selected Revision is not shown on the saved Need, and the Request composer asks for a Revision again. After the Need POST returns 201, the UI stays on the Process → Needs table with “Потребность сохранена.” instead of opening the new Need detail. The selector reads like separate communication identities, and the user must find and open the new row to continue. | [Two Revision choices](evidence/03-need-create-selection.png), [201 returned to the table](evidence/04-process-needs.png), [Need detail and separate Revision choice](evidence/05-need-detail.png) |
| **P1** | The Process “Архивировать” action fails in `local-demo`: the UI sends `PATCH /business-processes/{id}/status`, but the Vite local-demo allowlist rejects that route with 404; the UI reports “Бизнес-процесс не найден.” The FastAPI endpoint accepts the same authenticated request (200), and the archived view renders correctly after the API transition. | [Failed UI action](evidence/09-archive-action-404.png), [Archived Process → Needs](evidence/10-archived-process-needs.png), [Archived Need detail](evidence/11-archived-need-detail.png) |
| **P2** | The embedded Needs tab mixes the saved collection and creation form on one Process page. Its `Взаимодействие` and `Исходный компонент` columns show raw UUIDs; the first column is readable, but relationship columns are not scannable by name. The creation form offers each of the two published Revisions as a separate option for the same Interaction, repeating the traffic label. | [Empty table and creation form](evidence/02-empty-needs.png), [Populated table](evidence/04-process-needs.png), [Selected Revision](evidence/03-need-create-selection.png) |
| **P2** | The Request composer is embedded under Need Overview and extends below the 1080px viewport. Its long native selects clip the selected option, and the form mixes Russian captions with technical English labels (`Revision`, `Source Deployment`, `Destination Deployment`) and raw UUIDs in the confirmation summary. | [Request composition at 1920 × 1080](evidence/06-request-compose.png), [Created Request](evidence/07-request-detail.png) |

No P0 defect was observed. Empty, RETIRED, and archived Process/Need reads were truthful and usable. RETIRED blocks new Requests; an active Need under an archived Process remains readable and shows that Request creation is unavailable until the Process is restored. The retired detail is shown in [evidence](evidence/12-retired-need.png).

## Observed routes, labels, and reuse

- Process collection: `/business-processes`; Process detail: `/business-processes/{processId}`; Needs tab: `/business-processes/{processId}?tab=needs`.
- Need detail: `/business-processes/{processId}/needs/{needId}`; Request history tab: `?tab=requests`; created Request: `/access-requests/{requestId}`. No global `/connectivity-needs` route was present. This is a **new target requirement** in #139 / the target section of `docs/ux/real-navigation.md`, following the owner decision in PR #55; UI/IA Baseline v0.2 is historical here and is not the current Sidebar contract.
- Need table labels: `Потребность`, `Взаимодействие`, `Исходный компонент`, `Статус`. The Need link label is readable (`Process · Application · source → destination`) and includes its ID below it; the Interaction and participant columns show IDs only.
- Need creation: `Коммуникация`, `Обоснование потребности`, `Создать потребность`. The option is `Application · source → destination · traffic · traffic · Revision ID` (traffic appears twice).
- Request fields: `Revision`, `Source Deployment`, `Destination Deployment`; the summary mixes Russian captions with `Need`, `Interaction`, `Revision`, `Source Deployment`, `Source Resource`, `Destination Deployment`, and `Destination Resource` IDs.
- REAL shell and shared structures seen: `Frame`/`Shell`, `CollectionView` for BusinessProcesses, `DetailView` for Process and Need, `EntityTable` for embedded Needs and Request history, shared `Button`/`Badge`. Request composition is the feature-local `ComposeRequest` rendered inside Need Overview.
- Conformance review followed `docs/ux/real-ui-conformance.md`: the tested screens reused the REAL shell and established collection/detail/table structures, and the 1920 × 1080 render was visually inspected. The empty collection, active/retired Need, Request, and archived Process/Need states were truthful. No unsupported search/filter controls appeared. The screenshots above evidence the remaining deviations.

## Reproducible smoke

Run against a disposable local database and private credentials file (the paths below are examples outside the repository):

```bash
PYTHON=.venv/bin/python
"$PYTHON" -m napms.dev init-demo \
  --db /tmp/issue140.sqlite3 --credentials /tmp/issue140-creds.json
make run PYTHON="$PYTHON" \
  DB=/tmp/issue140.sqlite3 CREDENTIALS=/tmp/issue140-creds.json
```

1. In `http://127.0.0.1:5173/business-processes`, select **Requester**. The demo seed contains one Process and one Need.
2. Publish Revision 2 through the supported API at `POST /applications/{applicationId}/interactions/{interactionId}/revisions`, using the seeded Interaction and these synthetic clauses:

   ```json
   {"trafficClauses":[
     {"ipProtocol":"TCP","sourcePortStart":1024,"sourcePortEnd":2047,"destinationPortStart":8443,"destinationPortEnd":8443},
     {"ipProtocol":"UDP","sourcePortStart":null,"sourcePortEnd":null,"destinationPortStart":53,"destinationPortEnd":53}
   ]}
   ```

   Read the Requester token from the private credentials file for the bearer header. The API returned 201 and the Interaction exposed Revision 1 (`tcp(443)`) and Revision 2 (`tcp(1024-2047→8443); udp(53)`).
3. Create a Process named `Проверка пустого списка`; open its `Потребности` tab. Confirm the empty table and that its Communication selector contains two options for this one Interaction (one per Revision). Select Revision 2, enter a business basis, and create the Need. The Need creation API returns 201; the page remains on the table and shows “Потребность сохранена.” Click the new row to open its detail.
4. Open the new Need. In `Запросить доступ`, select Revision 2 and the seeded source/destination deployments, confirm the summary, and submit. `POST /access-requests` returns 201 and the browser opens the `PENDING` Request detail (GET 200).
5. Create another Process and Need. Clicking **Архивировать** demonstrates the local-demo 404 in the finding above. To inspect the supported archived read state, use the authenticated FastAPI `PATCH /business-processes/{processId}/status` with `{"status":"ARCHIVED"}` (200); reopen its `Потребности` tab and its saved Need.
6. Open the seeded demo Need and choose **Вывести из действия**. Confirm `Выведена из действия`, the truthful no-new-Requests callout, and that the `Заявки` tab remains available.

Screenshots show the actual Chromium render at the 1920 × 1080 viewport. The Need, Request, and archive states above were asserted in the browser; empty state and each lifecycle transition were inspected visually. The Request submission and Need creation used the REAL local API backed by the disposable SQLite database.
