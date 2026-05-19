# Project Structure

## File Organization

```
qr-system/
├── index.html          # Main HTML entry point
├── script.js           # Application logic and event handlers
├── style.css           # All styling and visual design
├── qrcode-lib.js       # QRCode.js library (third-party)
├── README.md           # Project documentation (Russian)
├── .kiro/              # Kiro AI assistant configuration
│   └── steering/       # AI guidance documents
└── .vscode/            # VS Code workspace settings
```

## File Responsibilities

### index.html
- Page structure and layout
- Tab navigation UI (URL, Image, Video)
- Input fields and buttons for each content type
- Result and preview containers
- Script loading order: `qrcode-lib.js` then `script.js`

### script.js
- Tab switching logic
- QR code generation for all content types (URL, image, video)
- File reading and base64 encoding
- Canvas manipulation and download functionality
- User feedback messages (success/error)
- Preview rendering for uploaded media

### style.css
- Complete visual styling
- Gradient background (`#667eea` to `#764ba2`)
- Tab component styling with active states
- Responsive container layout (max-width: 600px)
- Input, button, and result area styling
- Media preview styling

### qrcode-lib.js
- Third-party QR code generation library
- Provides `QRCodeLib.toCanvas()` method
- Should not be modified directly

## Code Conventions

### Language
- **UI Text**: Russian (Cyrillic)
- **Code**: English variable/function names with Russian comments where helpful

### Naming Conventions
- **Functions**: camelCase (e.g., `generateUrlQR`, `showMessage`)
- **IDs**: kebab-case (e.g., `url-input`, `download-btn`)
- **Classes**: kebab-case (e.g., `tab-btn`, `tab-content`)

### DOM Manipulation
- Use `document.getElementById()` for single elements
- Use `document.querySelectorAll()` for collections
- Prefer `classList` methods over direct className manipulation

### Event Handling
- Inline `onclick` attributes for primary actions
- `addEventListener` for dynamic elements (tabs)
- Always validate user input before processing

## Styling Patterns

- **Colors**: Primary purple (`#667eea`), secondary purple (`#764ba2`), success green (`#28a745`), error red (`#dc3545`)
- **Spacing**: Consistent padding (12px inputs/buttons, 30px sections)
- **Border Radius**: 8-15px for rounded corners
- **Transitions**: 0.3s for hover effects
- **Shadows**: `box-shadow` for depth on cards and QR codes

## Extension Guidelines

When adding new features:
1. Add new tab button in `.tabs` section if needed
2. Create corresponding `.tab-content` section
3. Implement generation function following `generate[Type]QR()` pattern
4. Update tab switching logic if adding new content types
5. Maintain consistent error handling with `showMessage()`
