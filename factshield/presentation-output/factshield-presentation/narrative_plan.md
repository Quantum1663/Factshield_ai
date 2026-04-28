## FactShield Final Presentation Plan

Audience: faculty, reviewers, project mentors, and presentation attendees evaluating both the technical depth and the practical usefulness of the system.

Objective: present FactShield as a complete misinformation-verification system with a clear problem statement, project gap, technical approach, user workflow, product implementation, and honest evaluation.

Narrative arc:
1. Frame the misinformation problem and why ordinary verification workflows break down.
2. Show the key gaps in existing manual and fragmented approaches.
3. Introduce FactShield as the proposed system.
4. Explain the technical architecture and verification pipeline with flowcharts.
5. Show how a user moves through the system from claim intake to final report.
6. Demonstrate the actual SaaS surfaces we implemented.
7. Show validation outcomes from tested claims.
8. Close with limitations, future work, and project value.

Slide list:
1. Title and project overview.
2. Problem statement.
3. Existing gaps and motivation.
4. Proposed solution and key objectives.
5. System architecture diagram.
6. Verification pipeline flowchart.
7. User workflow / operator journey.
8. SaaS workspace and implemented modules.
9. Backend and product capabilities delivered.
10. Scenario testing and observed outcomes.
11. Limitations and future improvements.
12. Conclusion and presentation close.

Source plan:
- Local project architecture from `factshield/ARCHITECTURE.md`.
- Verified frontend redesign and workspace pages from the local Next.js app.
- Implemented backend additions from this session:
  - real report export
  - backend-backed reports and saved investigations
  - team assignment persistence
  - settings persistence
  - approval status, reviewer notes, reviewer identity, and export metadata
  - normalization of stored text
- Live scenario-test results verified on April 28, 2026.

Visual system:
- Dark executive SaaS theme aligned to the current product UI.
- Cyan, teal, gold, and coral accents for structure and emphasis.
- Flowcharts, architecture blocks, and workflow diagrams built with editable PowerPoint shapes.
- Product screenshots used where they add credibility.

Asset plan:
- Reuse local screenshots:
  - `frontend-v3/verification-desktop.png`
  - `frontend-v3/verification-mobile.png`
- No decorative art generation needed; the content should prioritize clarity and diagrams.

Editability plan:
- All narrative content remains editable PowerPoint text.
- Diagrams use native shapes, arrows, and cards.
- The validation slide keeps one native chart.
- Speaker notes carry delivery hints rather than visible clutter.
