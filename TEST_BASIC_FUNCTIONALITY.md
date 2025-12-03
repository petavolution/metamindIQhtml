# 🧪 BASIC FUNCTIONALITY TEST CHECKLIST

## Priority: Make Sure It Actually Works!

Before adding more features, let's ensure the core application runs successfully.

---

## ✅ PHASE 1: Core Modules Work (Baseline)

### **Test Each Module Independently**

- [ ] **Symbol Memory**
  - Open `staticHTML/symbol_memory.html` in browser
  - Click "Start Training"
  - Complete 1-2 levels
  - Verify score updates
  - Verify completion screen shows

- [ ] **Morph Matrix**
  - Open `staticHTML/morph_matrix.html`
  - Start game
  - Select patterns
  - Submit answer
  - Verify scoring works

- [ ] **Expand Vision**
  - Open `staticHTML/expand_vision.html`
  - Start training
  - Verify numbers appear peripherally
  - Complete session
  - Check completion screen

- [ ] **Neural Synthesis**
  - Open `staticHTML/neural_synthesis.html`
  - Start module
  - Verify grid displays
  - Test audio plays
  - Complete level

- [ ] **Music Theory**
  - Open `staticHTML/music_theory.html`
  - Start training
  - Verify audio plays
  - Verify visualizations work
  - Complete session

- [ ] **Psychoacoustic Wizard**
  - Open `staticHTML/psychoacoustic_wizard.html`
  - Start game
  - Verify rhythm game works
  - Test audio syncs properly
  - Complete level

**Result:** [ ] All 6 modules work independently

---

## ✅ PHASE 2: Cognitive OS Integration Works

### **Test Symbol Memory with Cognitive OS**

- [ ] Open `staticHTML/symbol_memory.html`
- [ ] Check browser console for errors
- [ ] Verify "Cognitive OS Active" indicator appears (top-right)
- [ ] Complete a training session
- [ ] Verify "Skills Trained" notification appears
- [ ] Check console for skill updates:
  ```javascript
  SkillGraph.getModuleSkills('symbol_memory');
  // Should show: Visual WM, Feature Binding, Selective Attention
  ```

**Expected Console Output:**
```
[SkillGraph] Unified Skill Graph loaded - 18 cognitive skills tracked
[PerformanceTracker] Performance tracking system loaded
[ModuleAdapter] Cognitive OS integration active
[ModuleAdapter] Session tracking started
[ModuleAdapter] Session tracking ended
```

**Result:** [ ] Symbol Memory Cognitive OS integration works

---

## ✅ PHASE 3: Dashboard Works

### **Test Cognitive Profile Dashboard**

- [ ] Open `cognitive-os/dashboard.html`
- [ ] Check browser console for errors
- [ ] Verify "Overall Statistics" section loads
- [ ] Verify skill ratings appear
- [ ] Verify "Recommended Training Session" shows
- [ ] Click "Start Training" links work

**Expected Display:**
- Overall Rating: ~1500
- 18 skills grouped by domain
- Session recommendations (or message to complete first module)

**Result:** [ ] Dashboard loads and displays correctly

---

## ✅ PHASE 4: File Structure is Correct

### **Verify Directory Structure**

```
metamindIQhtml/
├── staticHTML/
│   ├── index.html          ✓ Landing page
│   ├── core.js             ✓ Core utilities
│   ├── symbol_memory.html  ✓ With Cognitive OS integration
│   ├── symbol_memory.js    ✓ Module logic
│   ├── (5 other modules)   ✓ Not yet integrated
│   └── styles.css          ✓ Shared styles
│
└── cognitive-os/
    ├── core/
    │   ├── skill_graph.js           ✓ 520 lines
    │   ├── performance_tracker.js   ✓ 400 lines
    │   └── module_adapter.js        ✓ 230 lines
    ├── plugins/
    │   └── session_composer.js      ✓ 340 lines
    ├── meta/                        ⚠️ Advanced (skip for now)
    ├── dashboard.html               ✓ Dashboard UI
    └── README.md                    ✓ Documentation
```

**Result:** [ ] File structure is correct

---

## ✅ PHASE 5: Path Resolution Works

### **Test Script Loading**

Open `symbol_memory.html` and check console:

**Scripts that should load:**
1. `core.js` ← from same directory
2. `symbol_memory.js` ← from same directory
3. `../cognitive-os/core/skill_graph.js` ← up one level, then into cognitive-os
4. `../cognitive-os/core/performance_tracker.js`
5. `../cognitive-os/plugins/session_composer.js`
6. `../cognitive-os/core/module_adapter.js`

**Console Checks:**
```javascript
// Check if loaded
typeof MetaMind !== 'undefined'  // true (from core.js)
typeof SkillGraph !== 'undefined'  // true (from skill_graph.js)
typeof PerformanceTracker !== 'undefined'  // true
typeof SessionComposer !== 'undefined'  // true
typeof ModuleAdapter !== 'undefined'  // true
```

**Result:** [ ] All scripts load correctly

---

## ✅ PHASE 6: Integration Sequence is Correct

### **Symbol Memory Load Sequence**

Correct order:
1. HTML loads
2. `core.js` loads → `MetaMind` object available
3. `symbol_memory.js` loads → Module functions available
4. `skill_graph.js` loads → `SkillGraph` object available
5. `performance_tracker.js` loads → `PerformanceTracker` object available
6. `session_composer.js` loads → `SessionComposer` object available
7. `module_adapter.js` loads → Auto-detects module, hooks into events

**Verification:**
- [ ] No "undefined" errors in console
- [ ] Cognitive OS indicator appears
- [ ] Session tracking starts automatically

**Result:** [ ] Load sequence is correct

---

## 🐛 COMMON ISSUES & FIXES

### **Issue 1: Scripts not loading (404 errors)**

**Symptom:** Console shows `404 Not Found` for Cognitive OS scripts

**Fix:**
```html
<!-- ❌ Wrong (if file is in staticHTML/) -->
<script src="cognitive-os/core/skill_graph.js"></script>

<!-- ✅ Correct (need to go up one level) -->
<script src="../cognitive-os/core/skill_graph.js"></script>
```

### **Issue 2: "SkillGraph is not defined"**

**Symptom:** Console shows `ReferenceError: SkillGraph is not defined`

**Fix:** Check that `skill_graph.js` loads BEFORE `module_adapter.js`

```html
<!-- ✅ Correct order -->
<script src="../cognitive-os/core/skill_graph.js"></script>
<script src="../cognitive-os/core/performance_tracker.js"></script>
<script src="../cognitive-os/plugins/session_composer.js"></script>
<script src="../cognitive-os/core/module_adapter.js"></script> <!-- Last -->
```

### **Issue 3: Module not detected**

**Symptom:** ModuleAdapter logs "Could not detect module ID"

**Fix:** Add explicit meta tag:
```html
<head>
    <meta name="module-id" content="symbol_memory">
</head>
```

### **Issue 4: Dashboard shows no data**

**Symptom:** Dashboard says "Complete at least one training module first"

**Fix:** Complete a full training session in Symbol Memory, then refresh dashboard

### **Issue 5: Skills not updating**

**Symptom:** Skill ratings don't change after training

**Fix:** Check console for errors in `module_adapter.js`. Verify session tracking starts.

---

## 📋 INTEGRATION STEPS (For Remaining Modules)

Use Symbol Memory as template:

### **Step 1: Add Module ID Meta Tag**

```html
<head>
    <meta name="module-id" content="MODULE_NAME_HERE">
</head>
```

Replace `MODULE_NAME_HERE` with:
- `morph_matrix`
- `expand_vision`
- `neural_synthesis`
- `music_theory`
- `psychoacoustic_wizard`

### **Step 2: Add Cognitive OS Scripts**

Before `</body>`, AFTER existing scripts:

```html
    <!-- Existing scripts -->
    <script src="core.js"></script>
    <script src="MODULE_NAME.js"></script>

    <!-- Cognitive OS Integration -->
    <script src="../cognitive-os/core/skill_graph.js"></script>
    <script src="../cognitive-os/core/performance_tracker.js"></script>
    <script src="../cognitive-os/plugins/session_composer.js"></script>
    <script src="../cognitive-os/core/module_adapter.js"></script>
</body>
```

### **Step 3: Test**

1. Open module in browser
2. Check console for errors
3. Complete one session
4. Verify Cognitive OS indicator and notifications

### **Step 4: Verify Dashboard**

1. Open `cognitive-os/dashboard.html`
2. Verify module appears in session history
3. Verify skill ratings updated

**Estimated time per module:** 5 minutes

---

## ✅ FINAL CHECKLIST

### **Baseline Functionality**
- [ ] All 6 modules work independently (no Cognitive OS)
- [ ] No console errors in vanilla modules
- [ ] All modules complete successfully

### **Cognitive OS Core**
- [ ] SkillGraph tracks 18 skills
- [ ] PerformanceTracker records sessions
- [ ] SessionComposer generates recommendations
- [ ] ModuleAdapter detects modules automatically

### **Integration**
- [ ] Symbol Memory integrated and working
- [ ] Dashboard loads and displays data
- [ ] Skill improvements notification works
- [ ] No 404 errors for scripts

### **Ready for Next Modules**
- [ ] Integration template works
- [ ] Path resolution correct
- [ ] Load sequence documented

---

## 🚀 NEXT STEPS (After All Tests Pass)

### **Immediate (1 hour)**
1. Integrate remaining 5 modules (5 × 5 min = 25 min)
2. Test each integration (5 × 5 min = 25 min)
3. Verify all modules show in dashboard

### **Short-term (1-2 days)**
4. Add enhanced trial-level tracking
5. Create simple progress charts
6. Add assessment mode starter

### **Long-term (1-2 weeks)**
7. Multi-signal adaptation
8. Module variants
9. PWA features

---

## 📝 TEST RESULTS LOG

Date: ___________

### Phase 1: Core Modules
- Symbol Memory: [ ] PASS [ ] FAIL - Notes: _______________
- Morph Matrix: [ ] PASS [ ] FAIL - Notes: _______________
- Expand Vision: [ ] PASS [ ] FAIL - Notes: _______________
- Neural Synthesis: [ ] PASS [ ] FAIL - Notes: _______________
- Music Theory: [ ] PASS [ ] FAIL - Notes: _______________
- Psychoacoustic: [ ] PASS [ ] FAIL - Notes: _______________

### Phase 2: Cognitive OS Integration
- Symbol Memory: [ ] PASS [ ] FAIL - Notes: _______________

### Phase 3: Dashboard
- Dashboard loads: [ ] PASS [ ] FAIL - Notes: _______________

### Phase 4-6: File Structure & Paths
- All files present: [ ] PASS [ ] FAIL - Notes: _______________
- Scripts load: [ ] PASS [ ] FAIL - Notes: _______________
- Sequence correct: [ ] PASS [ ] FAIL - Notes: _______________

**Overall Status:** [ ] READY [ ] NOT READY

**Blockers:** _______________________________________________

**Notes:** __________________________________________________
