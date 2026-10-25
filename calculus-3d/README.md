# عالم الدوال الحقيقية — Interactive 3D course site

An interactive 3D learning site for **MATH 1050, Chapter 1: Real-Valued Functions** (Prince Sattam Bin Abdulaziz University lecture notes, Stewart Appendix A).

- 20 lessons covering every section of the chapter (1.1 – 1.7), each with the same 9 parts: idea, formula, symbols, how it works, real-life example, why it matters, a worked example taken from the notes, an interactive 3D lab, and a quick quiz.
- A 3D spiral map of all lessons, a practice hall (30 tutorial problems + 24 review exercises with answers), search (`/` or `Ctrl+K`), a lessons drawer and progress tracking (stored in the browser).
- Arabic RTL interface; math rendered with KaTeX; 3D with React Three Fiber.

## Run

```bash
npm install
npm run dev          # local dev server
npm run build        # static build in dist/
npm run build:single # one self-contained HTML file in dist-single/
```

## Structure

| Path | What it holds |
| --- | --- |
| `src/content/` | Lesson text, formulas, worked examples, quizzes (`lessons1.ts`, `lessons2.ts`) and practice problems (`practice.ts`) |
| `src/labs/` | One interactive 3D experiment per lesson |
| `src/three/` | Reusable 3D building blocks: `Plot3D` (graphs), `NumberLine3D`, camera fitting, labels |
| `src/components/` | Lesson page, lab shell, quiz, search, drawer, controls |
| `src/views/` | Portal intro, 3D map, practice hall |
| `src/assets/grid-bg.jpg` | Background image supplied for the scenes |

Routes are plain hash tokens (`#map`, `#practice`, `#<lesson-id>`), so every lesson can be linked directly.

## Note on the source answers

Tutorial problem 4 in the notes' answer key gives `[-2,6) ∩ [1,8] = (1,6)`. Since 1 belongs to both sets the correct answer is `[1,6)`; the site shows the correction next to the problem.
