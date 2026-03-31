-- ColorPath v2 Seed Data
-- Seeds 3 problems (P1/P2/P3) and demo users

-- =============================================
-- DEMO USERS  (password: "password")
-- $2b$10$92IXU... = bcrypt hash of "password"
-- =============================================
INSERT INTO users (id, username, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin',   'admin@colorpath.edu',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'teacher1','teacher@colorpath.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher'),
  ('00000000-0000-0000-0000-000000000003', 'student1','student@colorpath.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student')
ON CONFLICT (email) DO NOTHING;

-- Note: password above is "password" (standard bcrypt test hash)
-- In production, change all passwords immediately

-- =============================================
-- PROBLEM P1: De Morgan Implication (11 steps)
-- =============================================
INSERT INTO problems (id, title, formula, assignment, difficulty, is_published, steps_json, targets_json)
VALUES (
  'P1',
  'De Morgan Implication',
  '¬(P ∧ Q) → (¬P ∨ ¬Q)',
  'P = T, Q = F',
  3,
  TRUE,
  '[
    {"color":"GREEN",  "target":"scopeLeft",    "cue":"Green: group left.",              "question":"Which part is the LEFT group?",              "choices":["¬(P ∧ Q)","(¬P ∨ ¬Q)","P","Q"],                   "correct":0, "explain":"Left side is ¬(P ∧ Q).",         "conceptTag":"scope_id"},
    {"color":"GREEN",  "target":"scopeRight",   "cue":"Green: group right.",             "question":"Which part is the RIGHT group?",             "choices":["(¬P ∨ ¬Q)","¬(P ∧ Q)","P ∧ Q","→"],              "correct":0, "explain":"Right side is (¬P ∨ ¬Q).",        "conceptTag":"scope_id"},
    {"color":"VIOLET", "target":"atomP",        "cue":"Violet: evaluate P.",             "question":"What is P?",                                  "choices":["True","False"],                                     "correct":0, "explain":"Assignment says P = True.",       "conceptTag":"atom_eval"},
    {"color":"VIOLET", "target":"atomQ",        "cue":"Violet: evaluate Q.",             "question":"What is Q?",                                  "choices":["True","False"],                                     "correct":1, "explain":"Assignment says Q = False.",      "conceptTag":"atom_eval"},
    {"color":"YELLOW", "target":"simpAnd",      "cue":"Yellow: evaluate (P ∧ Q).",       "question":"Evaluate (P ∧ Q):",                          "choices":["True","False"],                                     "correct":1, "explain":"T ∧ F = F.",                     "conceptTag":"conjunction"},
    {"color":"YELLOW", "target":"simpNotL",     "cue":"Yellow: apply not to the left.",  "question":"Compute ¬(P ∧ Q):",                          "choices":["True","False"],                                     "correct":0, "explain":"¬F = T.",                        "conceptTag":"negation"},
    {"color":"YELLOW", "target":"simpNotP",     "cue":"Yellow: not P.",                  "question":"Compute ¬P:",                                 "choices":["True","False"],                                     "correct":1, "explain":"¬T = F.",                        "conceptTag":"negation"},
    {"color":"YELLOW", "target":"simpNotQ",     "cue":"Yellow: not Q.",                  "question":"Compute ¬Q:",                                 "choices":["True","False"],                                     "correct":0, "explain":"¬F = T.",                        "conceptTag":"negation"},
    {"color":"BLUE",   "target":"combineRight", "cue":"Blue: combine with or.",          "question":"Right side (¬P ∨ ¬Q) equals:",               "choices":["True","False"],                                     "correct":0, "explain":"F ∨ T = T.",                     "conceptTag":"disjunction"},
    {"color":"BLUE",   "target":"combineImpl",  "cue":"Blue: evaluate the implication.", "question":"Evaluate: [¬(P ∧ Q)] → [(¬P ∨ ¬Q)]",        "choices":["True","False"],                                     "correct":0, "explain":"T → T = T.",                     "conceptTag":"implication"},
    {"color":"RED",    "target":"finish",       "cue":"Red: finished.",                  "question":"Overall formula is:",                         "choices":["True","False"],                                     "correct":0, "explain":"The statement is True.",          "conceptTag":"finish"}
  ]'::jsonb,
  '[
    {"id":"scopeLeft",    "label":"scope: ¬(P ∧ Q)"},
    {"id":"scopeRight",   "label":"scope: (¬P ∨ ¬Q)"},
    {"id":"atomP",        "label":"atom: P"},
    {"id":"atomQ",        "label":"atom: Q"},
    {"id":"simpAnd",      "label":"simplify: (P ∧ Q)"},
    {"id":"simpNotL",     "label":"simplify: ¬( … )"},
    {"id":"simpNotP",     "label":"simplify: ¬P"},
    {"id":"simpNotQ",     "label":"simplify: ¬Q"},
    {"id":"combineRight", "label":"combine: (¬P ∨ ¬Q)"},
    {"id":"combineImpl",  "label":"combine: →"},
    {"id":"finish",       "label":"finish"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- PROBLEM P2: Simple Conjunction (4 steps)
-- =============================================
INSERT INTO problems (id, title, formula, assignment, difficulty, is_published, steps_json, targets_json)
VALUES (
  'P2',
  'Simple Conjunction',
  'P ∧ Q',
  'P = T, Q = T',
  1,
  TRUE,
  '[
    {"color":"VIOLET", "target":"atomP",   "cue":"Step 1: Evaluate P. What is P?",       "question":"What is P?",         "choices":["True","False"], "correct":0, "explain":"P = True.",          "conceptTag":"atom_eval"},
    {"color":"VIOLET", "target":"atomQ",   "cue":"Violet: evaluate Q.",                  "question":"What is Q?",         "choices":["True","False"], "correct":0, "explain":"Q = True.",          "conceptTag":"atom_eval"},
    {"color":"BLUE",   "target":"combine", "cue":"Step 3: Combine P and Q. Evaluate P ∧ Q:", "question":"Evaluate P ∧ Q:", "choices":["True","False"], "correct":0, "explain":"T ∧ T = T.",        "conceptTag":"conjunction"},
    {"color":"RED",    "target":"finish",  "cue":"Red: finished.",                        "question":"Final answer:",      "choices":["True","False"], "correct":0, "explain":"The formula is True.", "conceptTag":"finish"}
  ]'::jsonb,
  '[
    {"id":"atomP",   "label":"atom: P"},
    {"id":"atomQ",   "label":"atom: Q"},
    {"id":"combine", "label":"combine: P ∧ Q"},
    {"id":"finish",  "label":"finish"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- PROBLEM P3: Disjunction with Negation (5 steps)
-- =============================================
INSERT INTO problems (id, title, formula, assignment, difficulty, is_published, steps_json, targets_json)
VALUES (
  'P3',
  'Disjunction with Negation',
  '¬P ∨ Q',
  'P = F, Q = T',
  2,
  TRUE,
  '[
    {"color":"VIOLET", "target":"atomP",    "cue":"Violet: evaluate P.",      "question":"What is P?",          "choices":["True","False"], "correct":1, "explain":"P = False.",         "conceptTag":"atom_eval"},
    {"color":"VIOLET", "target":"atomQ",    "cue":"Violet: evaluate Q.",      "question":"What is Q?",          "choices":["True","False"], "correct":0, "explain":"Q = True.",          "conceptTag":"atom_eval"},
    {"color":"YELLOW", "target":"simpNotP", "cue":"Yellow: not P.",           "question":"Compute ¬P:",         "choices":["True","False"], "correct":0, "explain":"¬F = T.",            "conceptTag":"negation"},
    {"color":"BLUE",   "target":"combine",  "cue":"Blue: combine with or.",   "question":"Evaluate ¬P ∨ Q:",    "choices":["True","False"], "correct":0, "explain":"T ∨ T = T.",         "conceptTag":"disjunction"},
    {"color":"RED",    "target":"finish",   "cue":"Red: finished.",            "question":"Final answer:",       "choices":["True","False"], "correct":0, "explain":"The formula is True.", "conceptTag":"finish"}
  ]'::jsonb,
  '[
    {"id":"atomP",    "label":"atom: P"},
    {"id":"atomQ",    "label":"atom: Q"},
    {"id":"simpNotP", "label":"simplify: ¬P"},
    {"id":"combine",  "label":"combine: ¬P ∨ Q"},
    {"id":"finish",   "label":"finish"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;
