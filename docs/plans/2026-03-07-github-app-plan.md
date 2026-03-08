# NeoPages GitHub App Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the token-based webhook bootstrap path with a GitHub App installation flow that supports repo discovery, shared webhook delivery, and installation-token cloning.

**Architecture:** Add GitHub App configuration to the dashboard and builder, persist installations in Supabase, sync installations via callback and webhook events, and mint installation tokens when projects are created or cloned. Keep the dashboard form compatible with manual repo entry, but enrich it with repo suggestions when the app is installed.

**Tech Stack:** Next.js route handlers, Supabase, GitHub REST API, RSA JWT signing, Express builder service.
