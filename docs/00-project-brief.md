# Project Brief

## Overview

Workout Trackr is a commercial performance-tracking application for recording
structured training data and evaluating progress over time. The current product
supports weightlifting and pace-based activities and is designed to expand into
broader personal performance metrics.

This repository is a ground-up modernization of an earlier MERN implementation.
It preserves the useful domain behavior while replacing the client-heavy React,
Express, Mongoose, and cookie-JWT architecture with a server-first Next.js and
PostgreSQL system.

## Product Objective

The application should help a user:

- Capture repeatable workout measurements with minimal ambiguity.
- Review recent performance before recording the next session.
- Compare historical measurements through paginated evidence and charts.
- Use working volume, hard sets, pace, speed, and distance to make informed
  training decisions.

The product is evidence-oriented rather than social. User data is private by
default, and there is no public feed, leaderboard, or community layer in v1.

## Engineering Objectives

- Authorize every user-owned read and write on the server.
- Model ownership and lifecycle relationships explicitly in PostgreSQL.
- Validate all mutation input with Zod at the server boundary.
- Calculate derived metrics in trusted domain functions.
- Use Server Components for data-heavy screens and Client Components only for
  interaction that requires browser state.
- Keep application-owned mutations in Server Actions instead of duplicating an
  internal REST API.
- Make database changes repeatable through committed Prisma migrations.
- Isolate local, Preview, and Production data through Neon branches.
- Maintain a production verification path covering linting, types, tests,
  builds, migrations, browser flows, and runtime logs.

## Implemented Scope

- Google OAuth through Auth.js and the Prisma Adapter.
- Database-backed sessions and protected application routes.
- Profile display and update flow.
- Log and exercise CRUD with ownership-scoped slugs.
- Weightlifting session CRUD with ordered sets and volume calculations.
- Pace session CRUD with pace and speed calculations.
- Previous-session evidence, paginated history, and progress charts.
- Mobile-first dark interface with accessible chart fallback tables.
- Vercel deployment, Neon branch-per-Preview integration, security headers,
  environment validation, and structured request-error logging.

## Non-Goals For V1

- Migrating legacy MongoDB records.
- Email/password authentication and password recovery.
- Public social or sharing features.
- An administrative dashboard.
- Unit switching beyond kilograms and kilometers.
- A public application API.
- Native mobile clients.

## Current Status

The v1 feature set and production-readiness work are implemented. The
application is deployed through Vercel, with local development using a
long-lived Neon development branch and deployments using isolated Preview and
Production database branches.
