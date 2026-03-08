# NeoPages: 3-Minute Demo Video Storyboard

**Target Audience:** Neo N3 Ecosystem Developers, EcoFund Grant Reviewers.
**Objective:** Demonstrate the magic of 30-second decentralized deployment, proving the technical reality of the NeoPages infrastructure.
**Tone:** Fast-paced, professional, "Vercel-like" smooth experience.

---

## 0:00 - 0:15 | The Hook: The Old Way vs. The NeoPages Way
**Visuals:** 
- Quick montage of a terminal window flashing complex `neofs-cli` commands, confused developers, and ugly gateway URLs (`http.fs.neo.org/gw/1a2b...`).
- *Cut to black.* Text appears: "Deploying to NeoFS used to be hard."
- *Fade in* to the clean, modern NeoPages Dashboard. Text: "Welcome to NeoPages."

**Voiceover/Text-to-Speech:** 
"Deploying to the decentralized web shouldn't require a Ph.D. in blockchain infrastructure. Meet NeoPages: The Web3 Vercel for the Neo N3 ecosystem."

---

## 0:15 - 0:45 | Step 1: One-Click GitHub Integration
**Visuals:**
- The cursor clicks "Login with GitHub".
- Instantly jumps to the "Create Project" screen.
- A list of the user's GitHub repositories appears. The user selects a standard React/Next.js project (e.g., `my-awesome-dapp`).
- The user clicks "Import". The build settings auto-detect the framework (React) and the build command (`npm run build`).

**Voiceover/Text-to-Speech:**
"With zero configuration, NeoPages syncs directly with your GitHub. Just select your repo, and our engine automatically detects your framework. No smart contracts to write, no wallets to connect."

---

## 0:45 - 1:45 | Step 2: The Automated Build Pipeline (The Magic)
**Visuals:**
- The screen transitions to the deployment log view.
- Real-time terminal output scrolls: `Cloning repository...`, `Installing dependencies...`, `Running build...`.
- *Key moment:* The logs highlight the custom NeoFS interaction. Zoom in on the log line: `Creating public NeoFS container...` and `Injecting __NEOFS__WEB_INDEX...`.
- A progress bar zips across as files are recursively uploaded.
- Status changes to **"Deployed"**.

**Voiceover/Text-to-Speech:**
"Behind the scenes, our sandboxed AWS builder nodes take over. We compile your code, automatically spawn a public container on Neo N3's decentralized storage network, and inject the critical routing properties. We handle the GAS fees and the complex CLI commands, so you don't have to."

---

## 1:45 - 2:30 | Step 3: Edge Routing & Instant Preview
**Visuals:**
- The user clicks the generated deployment URL (e.g., `https://my-awesome-dapp.neopages.dev`).
- A new tab opens, and the React app loads *instantly*.
- Open Chrome DevTools -> Network tab. Show the headers. Highlight `cf-cache-status: HIT` and `x-neofs-container: <Container_ID>`.
- The user goes back to VS Code, changes a headline in their React app from "Hello World" to "Hello Neo N3!", and runs `git push origin main`.
- Switch back to NeoPages: A new deployment automatically starts via Webhook.

**Voiceover/Text-to-Speech:**
"The result? A beautiful, human-readable domain instantly proxying your decentralized assets through our global Cloudflare Edge network, delivering Web2 speeds for Web3 apps. And because we are git-integrated, your next push triggers a seamless update automatically."

---

## 2:30 - 3:00 | The Vision & Call to Action
**Visuals:**
- Show the "Custom Domains" settings tab (briefly demonstrating adding `mygame.neo`).
- Montage of beautiful web apps running smoothly on NeoPages.
- The NeoPages logo appears alongside the Neo N3 logo.
- Text: "Deploy your first project for free today. neopages.dev"

**Voiceover/Text-to-Speech:**
"Custom domains, unlimited bandwidth, and true decentralized permanence. NeoPages is the infrastructure bridging the gap between traditional developers and the Neo ecosystem. Visit neopages.dev and launch your Web3 app in seconds."
