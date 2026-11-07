IDEAARENA PWA INSTALL BUTTON UPDATE

Copy/merge these files into your existing frontend folder:
- src/App.tsx (replace)
- src/App.css (replace)
- src/main.tsx (replace)
- index.html (replace)
- public/manifest.webmanifest (add)
- public/sw.js (add)
- public/icons/icon-192.png (add)
- public/icons/icon-512.png (add)

Keep your existing package.json, node_modules, Vite config, and all other source files.

The Install App button uses the browser's native install prompt when available.
On iPhone/iPad, browsers generally require the user to use Share > Add to Home Screen.
For installation prompts to work on phones, the deployed site must use HTTPS (localhost is allowed for development).

Local test:
cd C:\Users\chram\Documents\IdeaArenaAI\frontend
npm.cmd run dev

Note: PWA installation is not available from an ordinary LAN HTTP address or an insecure public URL.
