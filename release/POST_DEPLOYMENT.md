# Published release verification

Production commit: `de502e72b08468e01a0351561a33bbecd08f1d70`.

PR: https://github.com/psysafetywork-svg/barometr-psyhosotsialnoi-bezpeky/pull/5

Pages deployment: https://github.com/psysafetywork-svg/barometr-psyhosotsialnoi-bezpeky/actions/runs/40389519838 — **completed / success**, exact production SHA.

Published public portal: https://psysafetywork-svg.github.io/barometr-psyhosotsialnoi-bezpeky/

Published local portal: https://psysafetywork-svg.github.io/barometr-psyhosotsialnoi-bezpeky/local/index.html

Rollback commit: `0306399f255d6269cc67f15aef162ef0d5352d1e`.

## Actual production upgrade without JSON

A synthetic research was created through the old production UI directly on the actual local-portal URL. Storage was initially empty in this cloud browser. The same tab, browser profile, URL and origin were retained throughout the GitHub Pages update. No JSON export/import, localStorage replacement, storage clear or application-state injection was used for this test.

After the successful deployment, reloaded the same URL and chose Continue:

- Completed October checkup: completion flag retained, opens module 1, date `2026-10-23`, all **42 answers and 42 notes exactly equal**, **zero mismatches**.
- P40: answer `no`, company risk `confirmed`, applicability to the saved environment `confirmed` — all observed in DOM form controls after upgrade.
- Unfinished November checkup: all P01-P06 full answers and notes retained, P07 partial answer/note retained, P08-P12 unfilled, date `2026-10-24`, opens **module 2**, the first module with gaps.
- Research name, owner, environment and both periods retained.

Complete synthetic answer-by-answer evidence: [live-checkup-verification.json](evidence/live-checkup-verification.json).

This actual production-origin test supplements the already-passed pre-publication same-URL upgrade rehearsal and automated exact full-object retention tests (including imported results, environment data, Plan edits and all legacy stores).

## Published files and interface

- Git tree at production commit contains the exact prepared blobs: public `ebd667c59a6e0d6c96a3cd88c5a32804f7fd51f1`, local `8a7de00cee437ab65494d8cb5fbea11fdfbf4092`.
- Live local DOM engine SHA-256, with the browser's normal line-ending normalization: `89a991a71c0f948071602e542caff5df7f45d141956b5e434b8ddb1cd73c82a4`, exactly equal to prepared HTML's engine.
- All four public inline script hashes and both public stylesheet hashes exactly match the prepared public HTML. This includes the embedded standalone local HTML and shared public-example bundle. Static local styles match; the extra local style elements are runtime-injected by that exact verified engine.
- Public logo loaded. Public-to-local navigation opened the unchanged `/local/index.html` address in a new tab and exposed Continue for the same saved research.
- Public example E=clear/L=cloudy/P=clear displays substantive mixed-manager interpretation in all four sections.
- Production comparison shows seven modules, source switching, missing-survey labels and the one company checkup column. Its only buttons are Back, Employees and Managers; no report/export controls.
- Production checkup-only cloudy module opens, allows adding its action, and Plan editing works.

Screenshot: [production-public-example.jpg](evidence/production-public-example.jpg).

## Actual downloaded files on production HTTPS

The earlier HTTP-preview download event timeouts did **not** reproduce on the published HTTPS portal. Both files were actually downloaded through the ordinary, unmodified production buttons and read from the browser-shared download path:

- Company checkup HTML report: **1,040,206 bytes**, SHA-256 `0f1cd61b827175a52ad9c589b88968db86cda88742175c835ec3e68d80974301`. Contains the synthetic company name, company evaluation scope, four interpretation sections and print control. Private checkup notes are not leaked into the report.
- Filtered Plan XLSX: **10,791 bytes**, SHA-256 `baafcf42ad34344a59de67db57b932d45a1a1785c25e9914db98a3a463a52f45`. Valid ZIP/worksheet XML, two rows (header + exactly one selected action). Contains edited title `Production QA: збережена дія`, owner `QA координатор`, status `У роботі`, company scope.

This supersedes the earlier unconfirmed report/Excel capture status in the pre-publication record for these production scenarios. Full environment/profile report and XLSX equality remains covered by all 20 automated parity fixtures.

## Final test results and limits

- Approved source: 101/101.
- Prepared production: **101/101 + 179/179 + 24/24 = 304 passed**. Includes all 448 weather combinations and M5 clear/cloudy/clear.
- All 179 original production scenarios retained; no skipped/deleted cases. See regression reconciliation record for retired v2 assumptions.
- Actual print/PDF dialog and newly downloaded local HTML running with network disabled were **not observed**: the cloud browser URL policy rejects Blob/local-file page observation, and no offline switch is available. No workaround of that policy was attempted. The standalone payload is byte-synchronized, self-contained and compatibility-tested automatically.
- The full weather/profile matrix is automated, not individually clicked in the browser. Browser CSV/XLSX imports, independent replacement, sufficient/insufficient sample, comparison selection/periods, Plan edits/filter/reload and JSON restore were observed on the byte-equivalent candidate; production smoke checks are listed separately above.

Previously downloaded HTML files do not update themselves. A new copy is needed for new functions; moving data across browser contexts may require JSON. The same-origin online update above required none.
