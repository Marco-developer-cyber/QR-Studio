# Technology Stack

## Core Technologies

- **HTML5**: Semantic markup with Russian language support (`lang="ru"`)
- **CSS3**: Modern styling with flexbox, gradients, and transitions
- **Vanilla JavaScript**: No frameworks, pure ES6+ JavaScript

## Libraries

- **QRCode.js** (`qrcode-lib.js`): QR code generation library
  - Uses canvas-based rendering
  - Supports custom width and margin configuration

## Architecture

- **Client-side only**: No server required, runs entirely in the browser
- **File-based**: Static files served directly without build process
- **Event-driven**: DOM event listeners for tab switching and user interactions

## Browser APIs Used

- **FileReader API**: For reading uploaded image/video files as base64
- **Canvas API**: For QR code rendering and image export
- **Blob/Download API**: For downloading generated QR codes as PNG

## Running the Project

```bash
# No build or installation required
# Simply open index.html in any modern browser
```

**Supported Browsers**: Any modern browser with ES6+ support (Chrome, Firefox, Safari, Edge)

## Development Notes

- No package manager (npm/yarn) required
- No bundler or transpiler needed
- No dependencies to install
- Changes are immediately visible on page refresh
