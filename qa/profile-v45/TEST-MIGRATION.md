# Migration of semantic assertions

The former aspect/accordion and synthetic S/N/T fixture tests are replaced by `tests/profile-v45.mjs`, using raw responses and the current calculators. The baseline 179/179 result is retained separately. Calculator, privacy, import, storage, restore and progress tests remain in portal-regression.mjs. This is an intentional presentation contract migration, not a claim that the unmodified historical suite passes.

Replaced cases:

- semantic v2 defines all 27 aspects and approved positive conclusion
- semantic v2 E-only problem is aspect-specific
- semantic v2 alignment names concrete evidence from each available source
- semantic v2 visible interpretation avoids banned technical wording
- semantic v2 L-only problem is retained
- semantic v2 P-only gap is preventive
- semantic v2 E problem plus favorable P describes discrepancy
- P gap A: problematic E remains actionable with favorable L and corporate P
- P gap B: problematic L is retained and manager access is checked despite favorable E and P
- P gap C: problematic E and L give a stronger local signal without claiming a proved cause
- P gap D: one checkup serves two environments and only the weaker environment shows a local gap
- P gap at module level: diffuse cloudy E and L remain visible even without a problem item
- P gap across different aspects: E and L together warrant a module check, not an assumed shared cause
- semantic v2 fog does not close active issue
- fog-only module gives one data-limitation conclusion and no aspect cards or actions
- a real problem or P gap remains visible beside fog
- semantic v2 insufficient E sample is excluded, not fog
- semantic v2 insufficient L sample is excluded, not fog
- semantic v2 source not measured is not favorable
- semantic v2 E20 alone does not trigger M4-A3
- semantic v2 E31 alone requests pulse study and no routed action
- semantic v2 L16 alone produces narrow manager action
- semantic v2 L21 alone produces narrow change-risk action
- semantic v2 P40 requires confirmed applicability
- one corporate P40 result yields local action only where applicability is confirmed
- semantic v2 keeps five active aspects in one module
- semantic v2 C01 replaces duplicate change actions
- H01 C01 preserves independent emergency action M7-A3
- H01 C01 preserves other independent actions as well
- semantic v2 adaptive M4-A1 shows only relevant E17 steps
- semantic v2 P35 and P36 keep their action subsets separate
- semantic v2 E28 does not add overload steps
- semantic v2 E31 and confirmed P40 stay separate
- semantic v2 action cards use bullets and omit legacy sections
- semantic UX renders independent accordion cards for 1, 2 and 5 active aspects
- semantic v2 visible wording contains no складов and no mechanical colon lists
- semantic v2 dynamic signal wording is grammatically integrated

New coverage: all 448 raw weather combinations; all 42 practices and distinct states; all 56 survey items and four branches; explicit v45 catalogue/route/merge cases; seven four-section modules; shared report/Plan content.
