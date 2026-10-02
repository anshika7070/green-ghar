# GreenGhar — HTML/CSS/JS Hackathon Prototype

## Features
- Login / Signup using localStorage (demo only)
- Light / dark mode
- Responsive dashboard
- Energy calculator
- Water tracker
- Waste segregation
- Drag-and-drop image upload
- TensorFlow.js + MobileNet image classification
- Chart.js animated dashboard
- Carbon-footprint calculator
- Community leaderboard
- GreenGhar sustainability assistant
- User-specific localStorage data

## Run
Open `index.html` in a modern browser.

For best results, run with VS Code Live Server because TensorFlow.js model loading can be restricted by some browser/file configurations.

## Important AI note
MobileNet is a general ImageNet classifier. It is NOT trained specifically for waste classification. This prototype maps recognizable object labels to waste categories.

For a production/hackathon "proper waste classifier", train/fine-tune a waste dataset (for example, classes such as cardboard, glass, metal, paper, plastic, organic) and export a TensorFlow.js model. Then replace the MobileNet inference section with that custom model.

## Security note
The login system is intentionally frontend-only for a demo. Passwords are stored in browser localStorage and must NOT be used for real credentials. A real deployment needs a backend with hashed passwords, sessions/JWT, HTTPS and server-side validation.
