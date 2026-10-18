# Demo script and independent handoff

## Readiness summary

**Use now:** a local fixture-backed discovery demonstration, a reusable offline
synthetic sample, and an illustrative opportunity/evidence handoff.
The dashboard shows 12 demonstration repositories from a target cohort of 100;
analysis scores and candidate ownership/relationships are synthetic. It does not
read a live database or run Foundry during the demo.

**Not established:** independent human rehearsal, customer validation, cloud
deployment, production support, live integration, or catalog acceptance.
Local lint, typecheck, tests, and application build passed during packaging.
A local Chrome 155 production-server check reported 12 fixture rows, successful
API responses, and no runtime errors. Screenshot files are available below;
recording playback and independent human review remain pending. A generated
slideshow must not be represented as live interaction or human rehearsal.
The proposed [catalog](https://github.com/mcaps-microsoft/accelerators-catalog)
currently returns 404; metadata is provisional and not schema-validated.
Check the [release gates](../operations/runbook.md#release-readiness-checklist)
before publishing readiness claims.

## Customer story and account opener

A portfolio sponsor faces another request to fund a service that may duplicate
an existing capability. The engineering lead can find repositories, but cannot
quickly tell which relationships are real or which evidence is missing. This
demo lets them compare candidate portfolios, inspect one reuse hypothesis, and
capture the questions a maintainer must answer. The intended business outcome
is a better-scoped discovery decision, not an asserted cost saving or government
assessment.

“Before funding another capability, can we find where reuse may already exist,
understand what evidence is missing, and agree who should validate one
opportunity?”

Use with a portfolio sponsor, engineering lead, and repository/data owner.
Ask first: Which decision is blocked? Who owns it? Which sources may be read?
What would make a workshop worthwhile? Do not lead with a promise to rank teams,
prove savings, or find vulnerabilities.

## Journey: inputs → context → workflow → output → next

| Step     | Demonstrate / say                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Inputs   | Public repository metadata plus synthetic evidence signals in the built-in fixture; no customer credentials or source writes          |
| Context  | Twelve demo records, target 100; estate totals are fixture context. Ministry/portfolio membership is candidate-only                   |
| Workflow | Overview → candidate portfolio comparison → estate map → repository/Agentic opportunity. Separate health from confidence and coverage |
| Output   | One hypothesis captured in the opportunity brief with evidence references, unknowns, owner, validation action, and decision criteria  |
| Next     | Invite a discovery workshop, then an explicitly authorized, bounded read-only pilot if the sponsor agrees                             |

The [opportunity brief / worksheet](opportunity-brief.html),
[evidence example](evidence-example.json), and
[offline synthetic sample](synthetic-sample.json) are facilitator artifacts.
The example is illustrative, not proof for a real repository. The sample is
standalone reusable JSON, **not a dashboard mode, import, or job input**.

### Seven-step initial-request-to-pilot journey

| Step                         | Actual demo / handoff today                                                                              | Target customer workflow — requires validation or authorization                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1. Initial request           | Sponsor asks whether a capability might be reused; presenter captures the desired decision               | Sponsor names an accountable decision owner and measurable business question                                                |
| 2. Scope the inputs          | Show the 12-record fixture and its synthetic-analysis disclaimer, or discuss the separate offline sample | Data owner approves repository list, read-only methods, exclusions, and retention                                           |
| 3. Establish context         | Overview and candidate portfolio comparison explain confidence, coverage, and unknowns                   | Maintainers validate ownership, portfolio membership, baseline, and evidence completeness                                   |
| 4. Explore the workflow      | Navigate attention items, estate map, repository dossier, and opportunity                                | Authorized collection/scanning and reviewed read models support the same exploration; this integration is not demonstrated  |
| 5. Produce an output         | Manually fill the worksheet using illustrative evidence; no dashboard export is implied                  | Resolve real evidence citations at immutable commits and record a bounded reuse/workflow hypothesis                         |
| 6. Hold discovery workshop   | Agree the seven discovery questions, validation owner, and next meeting                                  | Maintainers accept, reject, or revise the hypothesis with rationale and pilot success criteria                              |
| 7. Authorize a bounded pilot | Present a proposal and explicit stop conditions; do not deploy during the demo                           | Named owners authorize identity, source scope, budget, retention, operational support, and teardown before any pilot starts |

## Presenter preparation

1. Follow [README setup](../../README.md#try-the-dashboard): Node >=22.14.0,
   pnpm 10.34.5, install, then `pnpm dev`. No environment, Docker, or Azure needed.
2. Open <http://127.0.0.1:3000> in a clean browser window. Check `/api/health`;
   this proves web availability, not external integration.
3. Confirm the demo label and 12 records. Keep overview, ministry insights,
   estate map, repository dossiers, and Agentic sections ready.
4. Open the worksheet and evidence example separately. Do not claim a dashboard
   export/worksheet-generation feature.
5. Hide unrelated tabs, accounts, notifications, terminal secrets, and browser
   profile information. Test keyboard navigation and readable zoom.
6. Use a timer; the scripts below total exactly five and fifteen minutes.

## Five-minute account opener — 05:00 total

| Elapsed     | Duration | Action and narration                                                                                                                        |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 00:00–00:40 | 00:40    | Tell the customer story and disclose 12 fixture records / target 100, synthetic scores, candidate ownership, and no live assessment         |
| 00:40–01:30 | 00:50    | Show overview, coverage, and captured fixture context. Popularity is not quality                                                            |
| 01:30–02:30 | 01:00    | Show candidate portfolio comparison and attention items. Explain health vs confidence vs coverage; unknown is not failure                   |
| 02:30–03:30 | 01:00    | Show estate map; follow one candidate relationship to a repository. Describe an inferred link as a hypothesis                               |
| 03:30–04:30 | 01:00    | Show one Agentic/reuse opportunity. Name missing evidence and a human validation owner; do not promise automated remediation                |
| 04:30–05:00 | 00:30    | Open the worksheet and evidence example. Ask for a discovery workshop with a sponsor, permitted scope, decision criterion, and next meeting |

Closing line: “Would a workshop to validate this one reuse hypothesis be useful?
If so, who owns the decision and what evidence would they need?”

## Fifteen-minute discovery conversation — 15:00 total

| Elapsed     | Duration | Action and narration                                                                                                                                         |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 00:00–02:00 | 02:00    | Discover the decision, audience, current process, owner, and success criterion; establish the synthetic/read-only boundary                                   |
| 02:00–05:00 | 03:00    | Show inputs and overview. Explain 12 vs target 100, captured fixture context, and why popularity is not quality                                              |
| 05:00–08:00 | 03:00    | Compare candidate ministry/portfolio signals and attention items. Discuss quality, confidence, coverage, and evidence needed to validate membership          |
| 08:00–11:00 | 03:00    | Explore estate map and repository dossier. Follow a candidate capability link; distinguish observed facts, inferred relationships, and unknowns              |
| 11:00–13:00 | 02:00    | Select one opportunity. Fill the worksheet using the evidence example; capture owner, constraints, validation action, and acceptance criteria                |
| 13:00–15:00 | 02:00    | Read back the opportunity and unknowns. Agree workshop/pilot CTA, sponsor, permitted source scope, review date, cost owner, and explicit authorization gates |

Do not start collection or provision cloud resources during discovery.
For a pilot, propose a time-boxed, owner-approved read-only scope with an agreed
repository count, evidence/quality criteria, identity mode, data retention,
budget, and teardown date. Success is a validated decision/hypothesis, not a
promised savings percentage or automated remediation.

### Seven discovery questions

1. Which funding, reuse, or workflow decision is blocked, and who can make it?
2. What is the current baseline: how is this capability discovered and assessed,
   and what effort or delay can the customer actually measure?
3. Which repositories and evidence sources may be read, and what is explicitly
   excluded from collection, model input, and publication?
4. Which maintainer can verify candidate ownership, relationships, and the
   evidence needed to accept or reject this hypothesis?
5. What security, residency, identity, retention, and human-review constraints
   must a workshop or pilot satisfy?
6. What observable result, evidence coverage, and acceptance/stop criteria would
   justify a next decision without inventing savings or readiness scores?
7. Who owns the pilot, cost, maintenance, and teardown, and when will they review
   the worksheet and approve or decline the next step?

### Proposed pilot success criteria — agree before starting

- One named sponsor and maintainer approve the question, fixed repository scope,
  time box, baseline, and decision date.
- Every claim used in the decision has a resolvable approved source/commit and
  evidence reference; unsupported claims remain explicitly unknown.
- The customer agrees a coverage target before collection and reviews missed or
  failed sources rather than silently excluding them.
- At least one reuse/workflow hypothesis is accepted, rejected, or revised by
  the accountable maintainer with evidence and a recorded next action.
- Any measured effort change is compared with the customer's baseline; no
  percentage saving is promised by the fixture.
- Read-only scope, redaction, selected access mode, approved budget, retention,
  and teardown checks pass; a boundary violation or absent authorization stops
  the pilot.
- A presenter/operator who did not implement the solution can reproduce the
  agreed handoff and explain its limits. This independent check is still pending.

## Worksheet and evidence walkthrough

Open `opportunity-brief.html` locally; it does not save entries, so print to PDF
before closing. Record the customer's problem
and desired decision, candidate reuse/workflow, evidence IDs/locations,
commit/dataset lineage where available, confidence, unknowns, risks, accountable
owner, next validation step, and success criteria.

Use `evidence-example.json` to explain the intended provenance boundary:
an illustrative record is not a collected artifact. For real evidence retain
repository and immutable commit references, artifact/checksum and tool/schema
versions, capture time, and redaction status. A model recommendation must cite
resolvable evidence; never substitute a plausible narrative for missing proof.
Review [methodology](../methodology/evidence-and-scoring.md) and
[security](../security/threat-model.md) for interpretation.

## Reusability and anonymization

| Reusable as supplied                              | Customer-specific customization / validation                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Fixture-backed dashboard and timed discovery flow | Business question, audience, vocabulary, and decision baseline; no live-data mode exists                              |
| Offline synthetic JSON sample                     | Approved fictional replacements for workshop discussion, kept separate from dashboard/job inputs                      |
| Opportunity worksheet and evidence example        | Accountable owner, actual evidence lineage, uncertainty, criteria, and follow-up; examples are not collected findings |
| Contracts, metrics, graph, and read-only adapters | Repository cohort, ownership mappings, scoring applicability, and integrated read models require validation           |
| Bicep and manual workflow templates               | Authorized tenant/subscription, access mode, identity, policies, quota, costs, retention, and teardown                |
| Capture instructions and narration structure      | Verified screenshots, redacted customer context, captions, and independently reviewed presentation                    |

Use `synthetic-sample.json` offline when an unrelated customer should not see
named BC Gov examples. It is intentionally separate from the built-in dashboard.
Explain its synthetic provenance and avoid implying it was imported into the UI.
For screenshots of the actual dashboard, retain the public-demo disclaimer.

Before sharing customer-specific worksheets or captures, remove customer/tenant
IDs, people, private repository URLs, secrets, source excerpts, and sensitive
security prioritization. Use clearly labelled synthetic replacements, not fake
“anonymized live findings.” Preserve lineage internally under agreed access and
retention rules; do not publish raw source or infer government endorsement.

## Reproducible screenshots and narrated recording

The following screenshot files now exist from the local fixture capture. Verify
their readability, caveats, and privacy before presenting them; file existence
does not establish independent review or a completed recording.

| Screenshot                                   | Capture                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| [Overview](../assets/overview.png)           | Overview including visible demo dataset context         |
| [Portfolio](../assets/portfolio.png)         | Candidate portfolio comparison with confidence/coverage |
| [Estate map](../assets/estate-map.png)       | Estate map and candidate relationships                  |
| [Opportunities](../assets/opportunities.png) | Agentic/reuse opportunity and its caveat                |

The [media gallery](../assets/index.html) includes the separate worksheet capture,
architecture image, [five-minute slideshow](../assets/demo-slideshow.mp4), and
[caption transcript](../assets/demo-captions.vtt). The slideshow uses generated
narration over screenshots, not live interaction or human rehearsal. Decode,
browser playback, downloaded-video seeking, and six caption chapters were checked.
See [release evidence](../assets/release-evidence.json) for scope and limitations.
For reproduction, use the same filenames under `docs/assets/`.

1. Record commit SHA, dataset version, browser/version, viewport (for example
   1440×1000), zoom 100%, and UTC capture date in the handoff.
2. Run the dashboard locally; use the same viewport and fixture on every capture.
   Wait for fonts, charts, and ELK layout to settle. Keep the demo label readable.
3. Capture the named sections into those paths using a browser screenshot tool.
   Review readability, crop consistency, caveats, and absence of personal data.
4. For a narrated video, screen-record the five-minute sequence with a visible
   timer or build an explicitly labelled slideshow from the four screenshots.
   Use the five-minute script's exact segment boundaries and disclose that a
   slideshow is not an interactive recording. Narrate the synthetic boundary,
   relationship uncertainty, output, and workshop CTA.
5. Include captions or a transcript; use human-reviewed pronunciation and pacing.
   Record the actual filename, duration, creation method, and playback check.
   Do not describe generated narration as a human rehearsal.
6. Verify each file exists and opens/plays before linking it from a handoff or PR.
   Do not publish placeholder image/video links or claim independent rehearsal.

If recording is unavailable, deliver the timed script plus verified screenshots
and explicitly mark narrated video pending. A live local walkthrough remains
the fallback; Azure is not required.

## Independent handoff checklist

For a presenter who did not implement the accelerator:

- [ ] Identify commit, runtime versions, fixture version, and current readiness
      limitations without relying on the author.
- [ ] Install and launch the dashboard with no environment/services; verify
      overview, candidate portfolio, estate map, and opportunities.
- [ ] Explain 12/100 scope, synthetic scores, candidate ownership, confidence vs
      coverage, no source writes, and no live cloud integration.
- [ ] Open worksheet, evidence example, and separate offline sample; capture one
      hypothetical decision without representing it as real evidence.
- [ ] Complete timed five- and fifteen-minute rehearsals; record reviewer,
      date, elapsed times, feedback, and outstanding fixes.
- [ ] Verify any linked screenshot/video files and accessible narration/transcript.
- [ ] State discovery/workshop/pilot CTA and the authorization, cost, identity,
      maintenance-owner, retention, and teardown gates.
- [ ] Hand over sanitized evidence/worksheet, known blockers, next meeting/owner,
      and [support/runbook](../operations/runbook.md) link.

Unchecked items remain pending. No independent human handoff or cloud
deployment has been established by this document.
