# ColorPath Logic Tutor

**A visual-first learning tool for dyslexic students learning discrete mathematics**

## Overview

ColorPath Logic Tutor helps students with dyslexia learn propositional logic using a color-sequenced workflow instead of text-heavy interfaces. Students follow colors (Blue → Purple → Yellow → Green → Orange) to solve logic problems step-by-step.

## How It Helps Dyslexic Students

**Visual-first learning**: Students follow colors instead of reading instructions, reducing reading load and using visual processing strengths.

**Step-by-step scaffolding**: Complex problems break into small sequential steps, reducing working memory overload.

**Minimal reading**: Interface uses colors, icons, and short questions. Students rely on visual cues rather than dense text.

**Gentle feedback**: Errors show hints, not failure messages, reducing anxiety and encouraging experimentation.

**Text-to-speech support**: All content can be spoken aloud, helping students who struggle with reading.

**Clear sequencing**: Color order makes logical flow explicit without parsing complex notation.

## Technical Implementation

Single-page web application using vanilla HTML5, CSS3, and JavaScript (ES6+) with no external dependencies. Client-side state management tracks problem progress, step indices, and user interactions. Web Speech API (`window.speechSynthesis`) provides text-to-speech for accessibility. CSS variables handle theming; CSS Grid/Flexbox provide responsive layout. Event-driven JavaScript validates color selections against expected steps, displays multiple-choice questions, and provides adaptive feedback. All problem definitions (formulas, steps, questions, answers) are embedded as JavaScript objects, making the tool lightweight and deployable as a single HTML file.

## Getting Started

1. Open `index.html` in a modern browser
2. Select a problem from the dropdown
3. Click a color → Answer the question
4. Follow the color sequence: 🟦 Blue → 🟪 Purple → 🟨 Yellow → 🟩 Green → 🟧 Orange

## Color System

- **🟦 Blue (Group)**: Identify scope, parentheses, clauses
- **🟪 Purple (Atom)**: Evaluate atomic propositions (P, Q, R, etc.)
- **🟨 Yellow (Simplify)**: Apply negation, identities, De Morgan's laws
- **🟩 Green (Combine)**: Combine sub-expressions using connectives (∧, ∨, →, ↔)
- **🟧 Orange (Finish)**: Finalize solution and verify correctness

## Research Questions

1. What barriers do dyslexic students face when learning discrete mathematics?
2. How does ColorPath Logic Tutor address these barriers?
3. What is the effectiveness of the color-sequenced approach?

## Project Files

- `index.html` - Main prototype
- `SPECIFICATION.md` - Complete design specification
- `PILOT_STUDY_PLAN.md` - Pilot study protocol
- `HOW_IT_WORKS.md` - User guide

---

**Course**: Programmer Centric Design and Research | **Institution**: NC State University | **Fall 2024**
