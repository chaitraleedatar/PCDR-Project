# ColorPath: Design Specification

## 1. Problem Statement

Students with dyslexia face barriers learning discrete mathematics: reading-intensive problem statements, working memory overload, sequential processing challenges, and abstract symbol manipulation. ColorPath addresses these through minimal reading requirements (visual color-coding), gentle feedback, clear sequencing, and stepwise learning.

## 2. Design Overview

### Core Concept

ColorPath guides students through logical formulas using a color-coded sequence:
- **🟦 Blue (Group)**: Identify scope, parentheses, clauses
- **🟪 Purple (Atom)**: Evaluate atomic propositions (P, Q, R, etc.)
- **🟨 Yellow (Simplify)**: Apply negation, identities, De Morgan's laws
- **🟩 Green (Combine)**: Combine sub-expressions using connectives (∧, ∨, →, ↔)
- **🟧 Orange (Finish)**: Finalize solution and verify correctness

### User Flow

1. Problem presentation with formula and variable assignments
2. Color selection: Student clicks color swatch
3. Question appears: Student answers multiple-choice question
4. Feedback: Correct answers advance; incorrect show hints
5. Completion: Summary shows performance metrics

### Design Principles

- Visual-first: Colors and icons replace text
- Progressive disclosure: Hints appear when needed
- Non-punitive: Errors are learning opportunities
- Accessible: Text-to-speech, high contrast, clear typography

## 3. Visual Design

**Layout**: Two-column (color rail left, problem area right). Color rail shows five swatches with color dots, emoji icons, and labels. Problem area shows formula, progress bar, questions, and feedback.

**Colors**: Blue (#2563eb), Purple (#7c3aed), Yellow (#ca8a04), Green (#16a34a), Orange (#f97316). Patterns/textures for colorblind accessibility.

**Typography**: 18px base font, 1.6 line height, 0.2px letter spacing. Formula display: 24px monospace.

## 4. Technical Implementation

### Architecture

Single-page web application using vanilla HTML, CSS, and JavaScript. No external dependencies. Web Speech API for text-to-speech.

### Data Structures

**Problem Definition**:
```javascript
{
  id: string,
  title: string,
  formula: string,
  assignment: string,
  steps: [{
    color: string,        // BLUE | PURPLE | YELLOW | GREEN | ORANGE
    question: string,
    choices: [string],
    correct: number,
    explain: string
  }]
}
```

**State Management**:
```javascript
{
  currentColor: string | null,
  index: number,          // Current step index
  routeMisclicks: number, // Wrong color attempts
  mcMisclicks: number,    // Wrong answer attempts
  ghostHints: number      // Hints shown
}
```

### Core Algorithms

**Step Validation**:
- Input: selectedColor, currentStepIndex
- Check if selectedColor matches expected step.color
- If wrong: show error, speak feedback, highlight correct color
- If correct: show multiple-choice question

**Multiple Choice Validation**:
- Input: selectedChoiceIndex, currentStep
- If correct: mark green, advance to next step after 300ms
- If wrong: mark red, show hint, allow retry

**Idle Detection**:
- Timer: 6000ms
- On expiry: show hint, speak step cue, highlight correct color

**Progress Calculation**:
- progressPercentage = (currentStepIndex / totalSteps) * 100
- Update progress bar width

### Text-to-Speech

Uses Web Speech API (`window.speechSynthesis`):
- Rate: 0.95 (slightly slower)
- Pitch: 1 (normal)
- Language: en-US
- Available for all text content via 🔊 buttons

### Accessibility

- ARIA labels on interactive elements
- High contrast colors (WCAG AA)
- Colorblind patterns on color dots
- Text-to-speech for all content
- Dyslexia mode toggle (compact/expanded text)

## 5. User Experience Flow

**Initial Load**: Problem displays with formula, assignments, color rail. First step hint appears.

**Solving a Step**:
1. Click color swatch → System validates
2. If correct: Question appears, speak cue
3. Answer question → Validate
4. If correct: Advance, reset color, show next step hint
5. If wrong: Show hint, allow retry

**Error Handling**:
- Wrong color: "You selected [color], but you need [correct color]"
- Wrong answer: Show hint explanation, allow retry

**Completion**: Summary shows totals and per-step breakdown.

## 6. Research Questions

1. What barriers do dyslexic students face when learning discrete mathematics?
2. How does ColorPath address these barriers?
3. What is the effectiveness of the color-sequenced approach?

**Evaluation**: Pilot study (2-3 participants) with think-aloud protocol, task completion, and interviews. Future full study with control/experimental groups.

## 7. Future Enhancements

- Sketch recognition: Draw formulas, recognize symbols, generate steps
- Block-based alternative: Drag-and-drop interface
- Adaptive Knowledge Tracing: Track conceptual understanding vs. language proficiency
- Teacher dashboard: Real-time student monitoring

---

**Word Count**: ~1,200 words (condensed from original ~2,500)
