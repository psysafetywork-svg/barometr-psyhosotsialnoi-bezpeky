# Production release candidate: verification record

Status: **release candidate verified for publication**, with the explicit browser-tool limitations listed below. No functional or storage incompatibility was found. Post-deployment verification is recorded separately after release.

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
- Existing production regression suite adapted to the approved v45 contract: **179/179 passed** (`production-regression-179.txt`). All 179 original scenarios remain, with zero skipped/deleted cases. `regression-reconciliation.json` maps every original case to its current case and records 56 assertion adaptations plus shared fixture/mock changes. The initial v2 run is retained in `legacy-regression-results.json` as historical evidence.

The old suite expected the retired semantic-v2 27-aspect object/card layout, old prose, the old standalone public example, and mandatory survey import before results. Its fixtures also omitted v45 item metrics and checkup answers. The updated tests preserve signal scope, missing-data safeguards, calculations, action routing, all original scenario counts and interaction checks while asserting the approved v45 contract. The source/candidate parity suite independently protects the complete approved text and output, rather than accepting arbitrary replacements. No portal runtime was changed to satisfy these tests. Whitespace/CRLF warnings from `git diff --check` are inherited from the byte-preserved approved HTML and intentionally not reformatted.

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

## Additional browser observations before publication

- Restored the actually downloaded JSON through the production candidate UI. Both periods, the completed/partial checkup and imported environments reappeared. This separate restore check did not replace the automatic-upgrade check above.
- Replaced only Office QA with a 19-employee / 9-manager CSV. The other environment retained 100/20 responses. Both comparison source views display insufficient sample only for Office QA. The original environment retains its cloudy/storm module-2 results.
- Switched the comparison to November: only that period's environment appears, with no survey data and unfinished checkup. No previous-period results leak into the map.
- Added a checkup-only action, edited title/owner/due/status, switched to a profile filter with zero actions and observed disabled Excel. Reloaded, continued the research and reopened Plan: all edited fields remained.
- On the **actual old GitHub Pages URL**, created another synthetic research through the unmodified UI: `QA Production Upgrade 2026-10-26`, environment `Контрольний майданчик`, October completed 42-answer/42-note checkup dated 2026-10-23, P40=no and both risk/applicability confirmed. Created November with P01-P06=full, P07=partial and seven notes, date 2026-10-24. No JSON was imported on that origin. This browser context is retained for post-deployment automatic-preservation verification. The old new-period/module-7 opening defect was observed on actual production as well.

## Browser-tool limitations (not claimed as successful checks)

- Direct HTML report and Excel download event capture timed out in the cloud browser. JSON download succeeded. A QA-only observer established that the real report button generated a 1,040,189-byte HTML Blob with the correct company-scope filename and invoked the browser download handoff without a JavaScript exception. Diagnostic code is outside the repository and is not deployed.
- Opening the generated report Blob was explicitly blocked by the cloud browser URL policy (only HTTP/HTTPS allowed). No bypass was attempted. The generated local report, print/PDF dialog, actual report/Excel file capture and newly downloaded standalone HTML running offline therefore remain unconfirmed browser checks. Self-contained HTML/assets, report text and XLSX bytes are verified automatically against the exact approved engine.
- Browser scenarios cover completed/partial checkup, E+L+P and P-only profiles, cloudy interpretation, insufficient sample, imports, replacement isolation, comparison and Plan. The full 448-combination/profile matrix is automated rather than individually clicked in the browser.
- The supplied approved Site's external URL presents a sign-in page to this browser. Source/version/hash were verified through Sites and its source checkout; source functionality was exercised through its local preview.

Previously downloaded local HTML files cannot update themselves. Users need a new copy for new features. Moving a study between different browser contexts may require a JSON backup; the same-origin online upgrade test above did not.

## Reproduction

With the approved Sites checkout available at `/workspace/sites/barometer-v45-manual-20261026`:

```sh
node release/prepare.cjs
node --test release/verified/qa/*.test.cjs
node --test release/compatibility.test.cjs
node --test tests/portal-regression.mjs
```
