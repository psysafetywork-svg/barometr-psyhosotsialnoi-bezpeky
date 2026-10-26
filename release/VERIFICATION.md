# Production release candidate: verification record

Status: **not approved for merge or publication yet**. Main and GitHub Pages remain unchanged.

## Pinned source and production base

- Sites version 19: `appgprj_6adf10b5210c8191896f2f9c4ba02aa2~appgver_7ec108c447648191975577aa70aaa711`, confirmed through Sites get_site_version.
- Source commit: `508e5f92c810692eb20baae130335e638509e04b`.
- Approved engine SHA-256: `6efa969a9eab49cd3a9ac0897da8dff8aa5c26ed22588938dac1dfc18cece090`.
- Production base and rollback: `0306399f255d6269cc67f15aef162ef0d5352d1e`.
- Main was checked again after preparation and still points to that base.
- Existing PRs 3 and 4 were inspected and not used as the source of this release.
- Latest observed Pages workflow for the base was `pages build and deployment`, completed successfully. This candidate has not been deployed.

## Production adaptation

`prepare.cjs` requires the pinned Sites checkout. It verifies the engine hash, uses the approved clean review pages, restores the exact production STORE and LEGACY_STORES, removes review banners and changes the local title. It synchronizes the embedded HTML byte for byte with `local/index.html`.

After decoding script escapes and normalizing only the storage identity, the executable engine is exactly equal to the approved engine. No thresholds, texts, design rules, calculation functions or interpretation functions were rewritten. Production pages do not execute manual-preview.js and contain no test storage keys, test banner, scenario controls or auto-created studies. The public approved interactive example remains.

File hashes are recorded in `source.json`. `verified/` is generated test scaffolding, excluded from Git and not part of the portal.

## Automated results

- Approved source: 101/101 tests passed (`approved-101.txt`).
- Production adaptation: 101/101 tests passed (`production-101.txt`). Only storage/path/build-metadata identities were adapted, with no functional assertion removed.
- This includes all 448 weather combinations, the module 5 E=clear/L=cloudy/P=clear case, all source profiles, plan scope, preserved legacy plan edits, comparison selection and source switching.
- Additional compatibility/parity suite: 24/24 passed (`compatibility-24.txt`).
- Exact comparisons on all 20 supplied synthetic research fixtures cover statuses, complete interpretation models, four-section report HTML, action plans, XLSX bytes with a fixed clock, and comparison maps for E and L.
- Old-production save -> new load -> new save retains the complete research object exactly, including surveys, environments, both checkup states, all answers, notes, dates, P40 flags and user-edited plan fields. Tested for separate local HTML and embedded downloaded payload. All eight legacy storage keys were also checked. JSON validation/restoration was tested separately.
- Existing production regression suite: **118/179 passed, 61 failed**. The event listener mock was corrected to retain multiple listeners (as browsers do); this fixed two P40 tests. No test assertion was removed or skipped. Full failure names and locations are in `legacy-regression-results.json`.

The remaining failures mostly assert semantic-v2 texts, aspect IDs/shape, report headings, old public-example DOM, and the old requirement to import surveys before presenting results. Examples: an all-clear report must contain the old conclusion; the report must have `<b>Що зробити</b>`; the interpretation must expose the old 27 aspects; the home screen must say results are unavailable for a completed checkup without surveys. The approved v45 behavior intentionally differs. These assertions have not been rewritten to make the run appear successful. They must be reconciled explicitly with the v45 contract before the required release gate can be called green. The source-parity suite proves these differences were not introduced by production adaptation.

## Observed browser upgrade, without JSON restoration

Browser URL stayed `http://terminal.local:4173/migration-check/index.html` in the same tab/profile/origin throughout the upgrade.

1. Loaded the exact previous production engine from the base commit. The preview server's live-reload injection originally broke an HTML report template. For this old-version test only, its inline engine was externalized unchanged into a script file. This is a preview transport adaptation, not a change to the production engine.
2. Used the old UI to create synthetic research, an environment, and two periods. Completed all 42 practices in the first period with varying answers, 42 distinct notes, date 2026-10-23, P40=no, risk=confirmed and environment applicability=confirmed. The old UI showed completion.
3. In the second period, answered P01-P06=full and P07=partial, added notes and date 2026-10-24. The old UI showed 1/7 modules complete. The old module-7 opening bug was also reproduced.
4. Replaced the served application with the candidate HTML, without clearing storage, changing URL, importing JSON or replacing the browser context. Reloaded and chose Continue.
5. Unfinished checkup opened at module 2, retained P07=partial and its note, all six module-1 answers/notes, date, and unfilled P08-P12.
6. Completed period retained its completed state and opened at module 1. Read back all seven modules through DOM fields: **42/42 answers, 42/42 notes, date and both P40 flags matched, zero differences**.

## Other observed browser checks

- Created environments and switched periods.
- Imported survey.csv into the production-site environment and survey.xlsx into the office environment. Both accepted 100 employee / 20 manager questionnaires and displayed seven module statuses with no validation errors.
- Comparison showed both environments, seven modules and one company-checkup column. Switching to managers changed module-2 cells to cloudy; clearing both selections displayed the empty-selection message. No comparison report/export controls were present.
- Viewed a checkup-only profile; company scope remained explicit. Opened the cloudy module-2 interpretation with meaningful content in all four sections.
- Added an action to the company-checkup Plan and edited its title, owner, deadline and status. The plan identified company scope and selected-view Excel semantics.
- Actually downloaded a JSON backup and parsed the downloaded file. It contains both periods with 42 and 7 answers.
- Public navigation, public example E=clear/L=cloudy/P=clear, local-portal opening in a new tab and Continue worked. The public example displayed mixed-manager interpretation.

## Unconfirmed checks and publication gate

- Actual HTML report and Excel downloads were **not confirmed**: the browser download event timed out after activation. Report also did not produce an observable download in a fresh portal tab; Excel activation by keyboard had the same result. JSON download succeeded. No portal JavaScript exception was observed, and generated report/XLSX contents pass automated tests. This does not prove either success or a user-facing export defect. The cause must be resolved before claiming the required browser export check passed.
- Actual report print/PDF dialog, newly downloaded local HTML running with network disabled, UI JSON restoration, survey replacement isolation and all small-sample/profile browser scenarios remain unconfirmed. Automated checks are not labeled as browser observations.
- No merge, Pages deployment, or post-deployment verification has been performed.

Previously downloaded local HTML files cannot update themselves. Users need a new copy for new features. Moving a study between different browser contexts may require a JSON backup; the same-origin online upgrade test above did not.

## Reproduction

With the approved Sites checkout available at `/workspace/sites/barometer-v45-manual-20261026`:

```sh
node release/prepare.cjs
node --test release/verified/qa/*.test.cjs
node --test release/compatibility.test.cjs
node --test tests/portal-regression.mjs
```
