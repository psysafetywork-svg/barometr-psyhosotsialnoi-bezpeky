# Відтворення перевірки data-safety patch

Перевірений commit: `c0c6b77e01e0f658894ad905762a6628426eded4`.

Працювати тільки в окремому checkout та із синтетичними даними. Browser-suite сам створює ізольовані HTTP origins, контексти й тимчасові on-disk profiles; реальний production-портал і профілі компаній не використовуються. Процесні crash-тести навмисно завершують створені ними процеси браузера.

Середовище фактичного прогону: Linux, Node 22, Chromium 156.0.8078.4, Firefox 157.0, WebKit 27.2. WebKit не означає Safari. Версії завантажених рушіїв слід звіряти з `storage-browser-results.json`; оновлення Playwright у майбутньому потребуватиме нової перевірки.

У стандартному Node-середовищі без стороннього `CODEX_PRIMARY_RUNTIME_NODE_MODULES`:

```bash
npm install --no-save playwright
npx playwright install --with-deps chromium firefox webkit
python -m pip install pymupdf pillow openpyxl
export BAROMETER_QA_OUTPUT=/tmp/barometer-storage-safety-review
mkdir -p "$BAROMETER_QA_OUTPUT"
node --test tests/portal-regression.mjs tests/storage-safety-unit.mjs > "$BAROMETER_QA_OUTPUT/node-tests.tap"
node tests/release-gate-matrix.cjs
node tests/checkup-browser.cjs
node tests/storage-safety-browser.cjs
node tests/export-corrective-review.cjs
python tests/inspect-corrective-pdfs.py
python tests/inspect-storage-xlsx.py
node tests/package-storage-review.cjs
```

Після автоматичних перевірок потрібно переглянути фактично створені PDF-сторінки та знімки. У первинному CI JSON поле візуального огляду може бути `Pending`; завершений перегляд зафіксовано окремим `STORAGE_SAFETY_VISUAL_2026-10-21.json` із відбитками PDF.

`tests/release-gate-browser.cjs` збережено як історичний pre-patch probe. Його початковий прогін зафіксував втрату даних і статус BLOCKED на старому коді; його не видаємо за поточний успішний suite. Відповідні поточні перевірки збереження виконують `checkup-browser.cjs` і `storage-safety-browser.cjs`, з явним контролем old/old, new/new та old/new. Історичні файли й попередні звіти не видаляли.

CI-workflow був тимчасовим, обмежувався тестовою гілкою та не містив deployment. Після завершення його видалено; наведені команди залишають відтворення доступним без автоматичної публікації.
