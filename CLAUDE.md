# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

TestFlow is an API testing workflow editor — a visual, node-based tool for defining HTTP request chains with assertions and data extraction. Built with Vite + React 19 + TypeScript 6 on `@xyflow/react` v12.

## Commands

```bash
npm run dev         # Start Vite dev server (port 5173)
npm run build       # Type-check + production build (tsc -b && vite build)
npm run lint        # ESLint
npm run preview     # Preview production build
node proxy/server.js  # Start the CORS proxy (required, port 58080)
```

There is no test suite configured yet.

## Architecture

### Node types (3)
- **httpRequest** — sends HTTP requests through the proxy; renders method badge + URL + status chip
- **assert** — evaluates assertions (status, responseTime, jsonBody, header) against a target node's response
- **extract** — extracts values from a source node's response body using JSONPath (`jsonpath-plus`), stores them as named variables

### Dual-handle system
Each node has two categories of handles on ReactFlow:
- **Flow handles** (`flow-in` / `flow-out`) — top/bottom, define execution order. Used by the topological sorter.
- **Variable handles** (`var-in-*` / `var-out-*`) — left/right, carry typed data between nodes (status, body, headers, extracted vars, etc.). Input handles also include dynamically generated `var-in-ref-*` handles for `{{template}}` references found in node config text.

Edge `type` is set to `'flow'` or `'data'` based on which handle category was connected.

### State management (no zustand — custom `useSyncExternalStore`)
- **`src/store/flowStore.ts`** — global execution state: proxy online status, selected node ID, execution context (`{ [nodeId|varName]: value }`), per-node execution status (`idle|running|success|error`)
- **`src/store/canvasStore.ts`** — multi-canvas (tab) management: list of canvases (each with nodes + edges), active canvas ID
- **`src/store/updateNodeContext.ts`** — React context that panels use to call `App.tsx`'s `updateNodeData` (which calls ReactFlow's `setNodes`)

### Execution engine (`src/lib/runner.ts`)
1. `topologicalSort(nodes, edges)` — Kahn's algorithm, throws with cycle info if DAG is cyclic
2. `runWorkflow(nodes, edges, context, callback, stopAt?)` — iterates sorted nodes sequentially, builds input values from upstream node outputs via edge map, calls `executeNode()`, stores results in context
3. `resolveTemplate(template, context)` — replaces `{{varName}}` / `{{nodeId.field.sub}}` with context values (throws if undefined)
4. On first error, execution stops (break). Results are communicated back via the callback which updates the store.

### Proxy (`proxy/server.js`)
Standalone Node.js HTTP server (no dependencies). Forwards requests to arbitrary URLs to bypass browser CORS. Frontend checks health at `GET /health` on startup and shows a warning banner if offline. All HTTP requests go through `POST /proxy?target=<url>`.

### Key file purposes
| File | Role |
|------|------|
| `src/types/nodes.ts` | All TS types, handle specs, data interfaces |
| `src/lib/runner.ts` | Workflow execution logic |
| `src/lib/topological.ts` | DAG sort + cycle detection |
| `src/lib/validateEdges.ts` | Connection rules (no self-connect, no duplicate, single-input-per-handle with auto-replace) |
| `src/lib/proxy.ts` | Client-side proxy health check + `proxyFetch()` |
| `src/App.tsx` | ReactFlow canvas, toolbar, canvas tabs, run controls, context menu, panel routing |
| `src/panels/ContextViewer.tsx` | Side panel showing all non-numeric context variables |

### Visual design
Ant Design / MUI card-style nodes with elevation shadows, 2px colored left accent bar, and 12px border-radius. Each node type sets `--node-accent` CSS variable: HTTP request `#1677ff`, assert `#fa8c16`, extract `#722ed1`. Color tokens in `:root` follow Ant Design v5 palette. Handles use accent color on hover with 3px focus-ring glow. `handleY(baseY, i)` in `src/types/nodes.ts` computes vertical handle positions from measured IO-section offset.

### TypeScript settings
- `verbatimModuleSyntax: true` — must use `import type` for type-only imports
- `erasableSyntaxOnly: true` — no enums, no `namespace`, no `constructor parameter properties`
- `noUnusedLocals` + `noUnusedParameters: true`
