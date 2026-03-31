-- TraceWise v2 Seed Data
-- Seeds 3 problems (P1/P2/P3) and demo users

-- =============================================
-- DEMO USERS  (password: "password")
-- $2b$10$92IXU... = bcrypt hash of "password"
-- =============================================
INSERT INTO users (id, username, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin',   'admin@tracewise.edu',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'teacher1','teacher@tracewise.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher'),
  ('00000000-0000-0000-0000-000000000003', 'student1','student@tracewise.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student')
ON CONFLICT (email) DO NOTHING;

-- Note: password above is "password" (standard bcrypt test hash)
-- In production, change all passwords immediately

-- =============================================
-- PROBLEM P1: If-Else Branch Tracing (7 steps)
-- Concept: reading variables, evaluating a condition, following the correct branch
-- =============================================
INSERT INTO problems (id, title, formula, assignment, difficulty, is_published, steps_json, targets_json)
VALUES (
  'P1',
  'If-Else Branch Trace',
  'x = 7
  if x % 2 == 0:\n    result = "even"\nelse:\n    result = "odd"\nprint(result)',
  'Trace what gets printed',
  2,
  TRUE,
  '[
    {"color":"GREEN",  "target":"scan",      "cue":"Scan the code structure.",           "question":"What kind of structure is this?",                      "choices":["A loop","An if-else statement","A function call"],   "correct":1, "explain":"The if / else keywords show this is a conditional branch.", "conceptTag":"code_scan"},
    {"color":"VIOLET", "target":"readX",     "cue":"Read the value of x.",               "question":"What is the value of x?",                              "choices":["2","7","0"],                                         "correct":1, "explain":"x = 7 — the right side of the assignment is 7.",         "conceptTag":"read_variable"},
    {"color":"YELLOW", "target":"evalMod",   "cue":"Evaluate the modulo expression.",    "question":"What is 7 % 2?",                                       "choices":["0","1","2"],                                         "correct":1, "explain":"7 divided by 2 is 3 remainder 1, so 7 % 2 = 1.",        "conceptTag":"evaluate_expression"},
    {"color":"YELLOW", "target":"evalCond",  "cue":"Evaluate the full condition.",       "question":"Is 7 % 2 == 0 True or False?",                         "choices":["True","False"],                                      "correct":1, "explain":"1 == 0 is False. The condition fails.",                 "conceptTag":"evaluate_expression"},
    {"color":"BLUE",   "target":"branch",    "cue":"Follow the correct branch.",         "question":"Which branch runs when the condition is False?",        "choices":["The if branch","The else branch","Neither branch"],   "correct":1, "explain":"When the condition is False, the else branch executes.", "conceptTag":"follow_branch"},
    {"color":"BLUE",   "target":"assign",    "cue":"Follow what happens in else.",       "question":"What does result get assigned to in the else branch?",  "choices":["even","odd","7"],                                    "correct":1, "explain":"The else branch runs result = odd.",                     "conceptTag":"follow_branch"},
    {"color":"RED",    "target":"output",    "cue":"Determine the output.",              "question":"What does print(result) display?",                      "choices":["even","odd","7"],                                    "correct":1, "explain":"result holds odd, so print(result) displays: odd",      "conceptTag":"output"}
  ]'::jsonb,
  '[
    {"id":"scan",     "label":"scan structure"},
    {"id":"readX",    "label":"read x"},
    {"id":"evalMod",  "label":"evaluate 7 % 2"},
    {"id":"evalCond", "label":"evaluate condition"},
    {"id":"branch",   "label":"follow branch"},
    {"id":"assign",   "label":"assign result"},
    {"id":"output",   "label":"output"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- PROBLEM P2: Print Statement Trace (4 steps) — EASIEST
-- Concept: reading variables and understanding f-strings
-- =============================================
INSERT INTO problems (id, title, formula, assignment, difficulty, is_published, steps_json, targets_json)
VALUES (
  'P2',
  'Print Statement Trace',
  'name = "Alex"\nscore = 95\nprint(f"Hi {name}, your score is {score}")',
  'Trace what gets printed',
  1,
  TRUE,
  '[
    {"color":"GREEN",  "target":"scan",    "cue":"Scan the code.",             "question":"How many variables are assigned before the print?",  "choices":["1","2","3"],                                                      "correct":1, "explain":"Two variables: name and score are assigned on lines 1 and 2.",   "conceptTag":"code_scan"},
    {"color":"VIOLET", "target":"name",   "cue":"Read the value of name.",     "question":"What is the value of name?",                         "choices":["Alex","score","Hi"],                                               "correct":0, "explain":"name = Alex — the string on the right side of the equals sign.",  "conceptTag":"read_variable"},
    {"color":"VIOLET", "target":"score",  "cue":"Read the value of score.",    "question":"What is the value of score?",                        "choices":["95","100","0"],                                                    "correct":0, "explain":"score = 95.",                                                     "conceptTag":"read_variable"},
    {"color":"RED",    "target":"output", "cue":"What does the print produce?","question":"What gets printed?",                                  "choices":["Hi Alex, your score is 95","Hi name, your score is score","Hi {name}, your score is {score}"], "correct":0, "explain":"f-strings replace {name} and {score} with their values: Alex and 95.", "conceptTag":"output"}
  ]'::jsonb,
  '[
    {"id":"scan",   "label":"scan structure"},
    {"id":"name",   "label":"read name"},
    {"id":"score",  "label":"read score"},
    {"id":"output", "label":"output"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- PROBLEM P3: Loop Accumulation Trace (6 steps)
-- Concept: tracing a for-loop step by step, accumulating a running total
-- =============================================
INSERT INTO problems (id, title, formula, assignment, difficulty, is_published, steps_json, targets_json)
VALUES (
  'P3',
  'Loop Accumulation Trace',
  'total = 0\nfor i in [1, 2, 3]:\n    total = total + i\nprint(total)',
  'Trace what gets printed',
  3,
  TRUE,
  '[
    {"color":"GREEN",  "target":"scan",    "cue":"Scan the code structure.",          "question":"What structure controls the repetition?",          "choices":["An if statement","A for loop","A function"],          "correct":1, "explain":"The for keyword starts a loop that repeats for each item in the list.", "conceptTag":"code_scan"},
    {"color":"VIOLET", "target":"init",   "cue":"Read the initial value of total.",  "question":"What is total before the loop starts?",            "choices":["0","1","3"],                                         "correct":0, "explain":"total = 0 on the first line — it starts at zero.",               "conceptTag":"read_variable"},
    {"color":"YELLOW", "target":"iter1",  "cue":"Trace iteration 1 (i = 1).",        "question":"After i=1 runs, what is total?",                   "choices":["0","1","2"],                                         "correct":1, "explain":"total = 0 + 1 = 1.",                                             "conceptTag":"evaluate_expression"},
    {"color":"YELLOW", "target":"iter2",  "cue":"Trace iteration 2 (i = 2).",        "question":"After i=2 runs, what is total?",                   "choices":["2","3","4"],                                         "correct":1, "explain":"total = 1 + 2 = 3.",                                             "conceptTag":"evaluate_expression"},
    {"color":"YELLOW", "target":"iter3",  "cue":"Trace iteration 3 (i = 3).",        "question":"After i=3 runs, what is total?",                   "choices":["5","6","9"],                                         "correct":1, "explain":"total = 3 + 3 = 6.",                                             "conceptTag":"evaluate_expression"},
    {"color":"RED",    "target":"output", "cue":"What does print(total) display?",   "question":"What is the final output?",                        "choices":["3","6","0"],                                         "correct":1, "explain":"After all 3 iterations, total = 6. print(total) displays 6.",   "conceptTag":"output"}
  ]'::jsonb,
  '[
    {"id":"scan",   "label":"scan structure"},
    {"id":"init",   "label":"read initial total"},
    {"id":"iter1",  "label":"iteration 1 (i=1)"},
    {"id":"iter2",  "label":"iteration 2 (i=2)"},
    {"id":"iter3",  "label":"iteration 3 (i=3)"},
    {"id":"output", "label":"output"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;
