// SPDX-License-Identifier: AGPL-3.0-or-later
// Side-effect CSS imports (layout.tsx → globals.css). Required for tsc --noEmit on TypeScript 7
// (TS2882) and harmless on TypeScript 5.9.
declare module '*.css';
