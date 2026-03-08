# NeoPages: The Web3 Vercel for the Neo N3 Ecosystem

## Executive Summary
**NeoPages** is a fully automated, developer-friendly Web3 hosting platform designed to abstract away the complexities of decentralized storage. Our mission is simple: **allow any Web2 developer to deploy their frontend applications to the NeoFS network in under 30 seconds, using the git-centric workflow they already know and love.**

By providing a seamless CI/CD pipeline, Edge routing via Cloudflare Workers, and native NeoFS integration, NeoPages significantly lowers the barrier to entry for the Neo ecosystem. We believe this infrastructure will be a major catalyst for onboarding thousands of developers and driving mainstream adoption of Neo N3.

## The Problem
Currently, deploying a decentralized application requires developers to:
1. Understand the intricacies of decentralized storage networks like NeoFS.
2. Manage wallets, GAS fees, and complex CLI tools manually.
3. Manually upload build artifacts every time code changes.
4. Struggle with unfriendly, non-human-readable URLs (e.g., `http.fs.neo.org/gw/<Container_ID>`).

This steep learning curve deters traditional Web2 developers from building in the Web3 space.

## The Solution: NeoPages
NeoPages solves this by bringing the "Vercel experience" to the Neo ecosystem.

### Core Features
- **Git-Integrated CI/CD:** Developers log in with GitHub, select a repository, and NeoPages automatically clones, builds, and bundles the application.
- **Zero-Friction NeoFS Deployment:** The NeoPages builder node automatically creates public containers, injects the critical `__NEOFS__WEB_INDEX` properties, and handles the recursive upload of artifacts to NeoFS.
- **Gas Abstraction:** NeoPages sponsors the initial storage and transaction fees, allowing developers to deploy their first projects entirely for free (freemium model).
- **Edge-Optimized Routing:** A lightweight, high-performance Cloudflare Worker acts as a reverse proxy, translating elegant, customizable subdomains (e.g., `my-app.neopages.dev`) into NeoFS gateway routes with full caching.
- **Custom Domains & Web3 Naming:** Full support for custom DNS and native Neo N3 naming service integrations.

## Technical Architecture
NeoPages is built on a highly scalable, modern tech stack:
1. **Control Panel & State Layer (Next.js & Supabase):** A high-performance dashboard for project management, environment variables, and deployment histories.
2. **Automated Builder Node (Docker & Node.js):** Secure sandboxed build environments running on AWS EC2, orchestrating standard package managers (npm, yarn, pnpm) and interfacing directly with the `neofs-cli`.
3. **Decentralized Storage Layer (NeoFS):** The highly redundant, distributed object storage network of Neo N3.
4. **Edge Delivery Network (Cloudflare Workers):** Sub-millisecond routing and asset caching globally.

## Go-to-Market & Business Model
NeoPages operates on a proven SaaS infrastructure model:
1. **Developer Freemium:** Free deployment for hobby projects (subsidized by Neo EcoFund grants and low NeoFS costs) to drive massive user acquisition.
2. **Pro Tier ($20/mo or GAS equivalent):** Custom domains, unlimited bandwidth, password protection, and multiple deployment environments (Preview & Production).
3. **Web3 Native Payments:** Native integration with NeoLine and O3 Wallet, allowing projects to fund their SaaS infrastructure directly with GAS.

## Funding Request & Roadmap
We are applying for an infrastructure grant from the **Neo EcoFund** to cover the following:
1. **Infrastructure Costs:** AWS Builder nodes, Supabase scaling, and initial NeoFS GAS subsidies for the freemium tier.
2. **Development & Auditing:** Finalizing the open-source CLI tools, strengthening sandbox security, and UX polish.
3. **Community Bounties:** Incentivizing the first 100 projects to migrate their hosting to NeoPages.

### Milestones
- **M1 (Completed):** PoC validated. Automated NeoFS container creation and Cloudflare Edge proxying operational.
- **M2 (Current):** System integration. Next.js dashboard, Supabase Auth, and GitHub Webhooks active. Enterprise-grade monorepo refactor completed.
- **M3 (Next 30 Days):** Public Beta Launch. Open to the Neo developer community for testing and feedback.
- **M4 (Next 90 Days):** Pro Tier rollout, NeoLine wallet payment integration, and custom domain support.

## Conclusion
NeoPages is not just a hosting platform; it is a critical piece of public good infrastructure for the Neo blockchain. By eliminating deployment friction, we empower developers to focus on what matters most: building incredible decentralized applications.
