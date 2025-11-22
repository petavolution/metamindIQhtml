# MetaMindIQTrain - Static HTML Modules

Web-based cognitive training modules. Zero dependencies, deployable anywhere.

## Quick Start

```bash
# Option 1: Open index.html directly in browser

# Option 2: Run local server
python -m http.server 8000
# Then visit http://localhost:8000
```

## Project Structure

```
staticHTML/
├── index.html              # Landing page
├── core.js                 # Shared utilities (audio, timers, state, DOM)
├── styles.css              # Shared CSS (theme, layout, components)
│
├── Visual Cognition Modules
│   ├── symbol_memory.*     # Visual memory training
│   ├── morph_matrix.*      # Pattern recognition training
│   ├── expand_vision.*     # Peripheral awareness training
│   └── neural_synthesis.*  # Cross-modal integration
│
└── Audio/Rhythm Modules
    ├── music_theory.*      # Music theory training
    └── psychoacoustic_wizard.*  # Rhythm/timing training
```

## Modules

### Visual Cognition

| Module | Purpose | Skills Trained |
|--------|---------|----------------|
| **Symbol Memory** | Memorize symbol patterns, detect changes | Working memory, attention |
| **Morph Matrix** | Identify rotations vs modifications | Spatial reasoning, mental rotation |
| **Expand Vision** | Track peripheral numbers | Peripheral awareness, divided attention |
| **Neural Synthesis** | Match visual-audio patterns | Cross-modal integration |

### Audio/Rhythm

| Module | Purpose | Skills Trained |
|--------|---------|----------------|
| **Music Theory** | Identify scales, intervals, chords | Ear training, musical cognition |
| **Psychoacoustic Wizard** | Hit notes in time | Rhythm, timing precision |

## Architecture

### core.js - Shared Utilities

```javascript
MetaMind.Audio      // Web Audio API wrapper
MetaMind.Screens    // Screen transitions
MetaMind.Timer      // Countdown and delay timers
MetaMind.DOM        // DOM manipulation helpers
MetaMind.MathUtils  // Random, shuffle, clamp, lerp
MetaMind.Storage    // localStorage wrapper
MetaMind.Colors     // Theme colors and palettes
```

### styles.css - CSS Variables

```css
--bg-primary        /* Main background */
--color-success     /* Correct answer feedback */
--color-error       /* Wrong answer feedback */
--color-primary     /* Interactive elements */
--transition-normal /* Standard animation speed */
```

## Customization

1. **Colors**: Edit `:root` variables in `styles.css`
2. **Timing**: Adjust `memoryTime`, `delay` in module JS files
3. **Difficulty**: Modify `gridSize`, `level` progression logic

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+

## Deployment

Works with any static host:
- GitHub Pages
- Netlify / Vercel
- AWS S3
- Any web server

Just upload all files maintaining the directory structure.
