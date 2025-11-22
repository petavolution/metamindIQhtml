# MetaMindIQTrain - Static HTML Versions

This directory contains web-based versions of the MetaMindIQTrain cognitive training modules. These static HTML versions can be deployed on any web server without needing Python or PyGame.

## Contents

- **index.html** - Main landing page with links to all modules
- **styles.css** - Shared styles for all modules
- **morph_matrix.html/.css/.js** - Morph Matrix training module
- **expand_vision.html/.css/.js** - Expand Vision training module
- **symbol_memory.html/.css/.js** - Symbol Memory training module

## How to Use

### Local Testing

1. You can open the HTML files directly in your browser for local testing
2. For better security, run a local web server:

```bash
# Using Python's built-in HTTP server
python -m http.server

# Or using Node.js with http-server
npx http-server
```

### Deployment

These files can be deployed to any static web hosting service, such as:

- GitHub Pages
- Netlify
- Vercel
- Amazon S3
- Any standard web hosting service

Simply upload all the files in this directory to your hosting service.

## Module Features

### Morph Matrix

- Trains pattern recognition and spatial reasoning
- Features a matrix-based challenge with rotated patterns
- Identifies spatial reasoning skills and attention to detail
- Uses bright red and green cells on a dark background for visual clarity

### Expand Vision

- Improves peripheral vision and multi-focal attention
- Features an expanding oval with a central focus point
- Displays random numbers in the peripheral vision
- Challenges users to calculate sums while maintaining central focus

### Symbol Memory

- Enhances short-term memory and attention to detail
- Features patterns of symbols to memorize
- Displays colorful symbols in a grid that users must remember
- Challenges users to identify if and where a symbol was changed
- Provides immediate feedback on correctness
- Increases in difficulty as levels progress

## Customization

You can customize these modules by editing the CSS files:

- Change colors in the `:root` variables in `styles.css`
- Adjust dimensions and timing in the respective module CSS files
- Modify difficulty settings in the JavaScript files

## Browser Compatibility

These modules are designed to work in modern browsers:

- Chrome/Edge (latest versions)
- Firefox (latest versions)
- Safari (latest versions)

For the best experience, use a desktop or laptop computer with a modern browser.

## License

These files are part of the MetaMindIQTrain project and follow the same licensing terms as the main project. 