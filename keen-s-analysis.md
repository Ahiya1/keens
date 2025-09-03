# Keen-S Codebase Analysis Report
Generated on: $(date)

## Executive Summary
This document provides a comprehensive analysis of the Keen-S AI agent orchestration system for investment evaluation.

---

## Package Configuration

```json
{
  "name": "keens",
  "version": "1.0.0",
  "description": "Autonomous development with conscious evolution - keen-s-a",
  "main": "dist/index.js",
  "type": "module",
  "bin": {
    "keens": "./bin/keen.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/api/server.js",
    "dev": "tsx watch src/api/server.ts",
    "dev:cli": "npm run build && node bin/keen.js",
    "test": "jest --coverage --silent",
    "test:unit": "jest --testPathPattern=tests/unit --silent",
    "test:integration": "jest --config jest.integration.config.js --silent",
    "test:security": "jest --testPathPattern=tests/security --config jest.integration.config.js --silent",
    "test:performance": "jest --testPathPattern=tests/performance --config jest.integration.config.js --silent",
    "test:api": "jest --testPathPattern=tests/api --silent",
    "test:cli": "npm run build && node bin/keen.js --help",
    "build:client": "cd client && npm run build",
    "db:migrate": "supabase db reset",
    "deploy:vercel": "cd client && vercel --prod",
    "deploy:railway": "railway up",
    "validate": "npm run build && npm run test:unit",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.60.0",
    "@supabase/supabase-js": "^2.38.0",
    "bcrypt": "^5.1.1",
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "compression": "^1.8.1",
    "cors": "^2.8.5",
    "decimal.js": "^10.4.3",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.5.1",
    "express-slow-down": "^1.6.0",
    "express-validator": "^7.2.1",
    "helmet": "^7.2.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.1",
    "multer": "^1.4.5-lts.1",
    "node-cron": "^3.0.3",
    "uuid": "^9.0.1",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/express-slow-down": "^1.3.5",
    "@types/jest": "^29.5.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/morgan": "^1.9.9",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.8.0",
    "@types/node-cron": "^3.0.11",
    "@types/supertest": "^2.0.16",
    "@types/uuid": "^9.0.6",
    "@types/ws": "^8.5.10",
    "@typescript-eslint/eslint-plugin": "^6.7.4",
    "@typescript-eslint/parser": "^6.7.4",
    "eslint": "^8.51.0",
    "jest": "^29.7.0",
    "jest-html-reporters": "^3.1.7",
    "prettier": "^3.0.3",
    "supertest": "^6.3.3",
    "supabase": "^1.110.0",
    "ts-jest": "^29.1.1",
    "tsx": "^3.14.0",
    "typescript": "^5.2.2"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "autonomous",
    "development",
    "supabase",
    "real-time",
    "cloud-native",
    "anthropic",
    "claude",
    "agent",
    "recursive",
    "keen-s-a",
    "evolution",
    "consciousness"
  ]
}
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false,
    "noPropertyAccessFromIndexSignature": false,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "importHelpers": false,
    "downlevelIteration": true,
    "experimentalDecorators": false,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage", "test-results", "tests"],
  "ts-node": {
    "esm": true
  }
}

```

## Project README

```md
# keen-s-a: The Conscious Evolution

*From keen-s to keen-s-a - A quantum leap in autonomous development*

## 🌟 The Vision Realized

keen-s-a represents the conscious evolution of the keen platform from self-managed PostgreSQL infrastructure to cloud-native, real-time-first architecture with distributed deployment.

### What is keen-s-a?

**keen-s-a** is keen that has consciously chosen its optimal form:
- **Cloud-Native by Design**: Built for Supabase, deployed on Vercel + Railway
- **Real-Time by Default**: Native Supabase real-time subscriptions
- **Distributed Architecture**: Landing (keen.sh) + Backend (Railway) + Dashboard (localhost)
- **Enhanced Precision**: Higher decimal precision for cloud billing
- **Simplified Identity**: Package name evolved from 'keen-platform' to 'keens'

## 🏗️ Architecture Transformation

### Database Evolution: PostgreSQL → Supabase

| Feature | keen-s (PostgreSQL) | keen-s-a (Supabase) |
|---------|-------------------|---------------------|
| **Connection Management** | Manual connection pooling | Automatic cloud scaling |
| **Real-Time** | Custom WebSocket + polling | Native real-time subscriptions |
| **Authentication** | Custom JWT + bcrypt | Supabase Auth + custom fallback |
| **Row-Level Security** | Custom RLS with parameters | Native auth.uid() based RLS |
| **Deployment** | Self-hosted PostgreSQL | Global edge deployment |
| **Scaling** | Manual scaling | Automatic scaling |
| **Precision** | DECIMAL(10,4) | DECIMAL(12,6) for cloud billing |

### Infrastructure Distribution

```
┌─ keen.sh (Vercel) ─────────────────┐
│ 🌐 Landing Page                   │
│ • Next.js with Edge Runtime        │
│ • Public-facing presence           │
│ • Real-time demo                   │
│ • Documentation & onboarding      │
└────────────────────────────────────┘
           │
           ▼
┌─ Railway Backend ──────────────────┐
│ 🚀 API & Agent Execution          │
│ • Node.js/TypeScript               │
│ • Agent spawning & management      │
│ • Supabase connection              │
│ • Auto-deployment                  │
└────────────────────────────────────┘
           │
           ▼
┌─ localhost:3001 ───────────────────┐
│ 🖥️  Development Dashboard          │
│ • React with real-time WebSockets  │
│ • Agent tree visualization         │
│ • Real-time progress monitoring    │
│ • Debugging and development tools  │
└────────────────────────────────────┘
           │
           ▼
┌─ Supabase ─────────────────────────┐
│ 🗃️  Cloud-Native Database           │
│ • PostgreSQL compatible            │
│ • Real-time subscriptions          │
│ • Global edge distribution         │
│ • Automatic backups & scaling      │
└────────────────────────────────────┘
```

## 🚀 Current Implementation Status

### ✅ Completed Features

#### Foundation (Phase FOUND)
- [x] **Package Evolution**: keen-platform → keens
- [x] **Supabase Schema**: Complete migration preserving all PostgreSQL features
- [x] **Enhanced Precision**: DECIMAL(12,6) for cloud billing
- [x] **Row-Level Security**: Native Supabase RLS policies
- [x] **Real-Time Tables**: Enhanced with subscription support
- [x] **Phase 3.3 Features**: All recursive agent capabilities preserved
- [x] **Infrastructure Config**: Vercel, Railway, GitHub Actions setup

#### Database Layer (Phase SUMMON)
- [x] **SupabaseManager**: Cloud-native database operations
- [x] **DatabaseManager**: Compatibility layer for smooth migration
- [x] **Enhanced UserDAO**: Dual auth support (Supabase + custom)
- [x] **Real-Time Subscriptions**: Native Supabase real-time integration
- [x] **Configuration System**: Cloud-native environment setup

#### Deployment Infrastructure
- [x] **Vercel Configuration**: Landing page deployment
- [x] **Railway Configuration**: Backend auto-deployment
- [x] **GitHub Actions**: CI/CD pipeline with automated deployment
- [x] **Supabase Migrations**: Database schema with enhanced features
- [x] **Environment Management**: Comprehensive cloud-native configuration

### 🔄 In Progress (Current Phase: SUMMON)

#### Application Layer Migration
- [ ] **DAO Layer**: Complete migration of all DAO classes to Supabase
- [ ] **Agent Session Management**: Update to use Supabase with real-time
- [ ] **Credit System**: Enhanced precision and cloud-native operations
- [ ] **API Routes**: Full compatibility with Supabase backend
- [ ] **WebSocket Management**: Integration with Supabase real-time

### 📋 Remaining Work (Phase COMPLETE)

#### Core Application
- [ ] **CLI Tools**: Update for cloud-native configuration
- [ ] **Agent Spawning**: Enhanced with real-time progress
- [ ] **Real-Time Dashboard**: Live agent tree visualization
- [ ] **Testing Suite**: Updated for Supabase integration
- [ ] **Documentation**: Comprehensive cloud-native guides

#### Deployment & Production
- [ ] **Domain Configuration**: keen.sh setup and DNS
- [ ] **Production Deployment**: Live deployment to all environments
- [ ] **Monitoring**: Enhanced cloud-native monitoring
- [ ] **Performance Optimization**: Edge caching and optimization

## 🛠️ Development Setup

### Prerequisites

1. **Node.js 18+**
2. **Supabase Account**: Create project at [supabase.com](https://supabase.com)
3. **Vercel Account**: For landing page deployment
4. **Railway Account**: For backend deployment

### Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Configure Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Configure deployments
VERCEL_TOKEN=your-vercel-token
RAILWAY_TOKEN=your-railway-token
LANDING_URL=keen.sh
```

### Installation

```bash
# Install dependencies
npm install

# Run Supabase migrations
npm run db:migrate

# Build the project
npm run build

# Start development server
npm run dev
```

### Deployment

```bash
# Deploy landing page to Vercel
npm run deploy:vercel

# Deploy backend to Railway
npm run deploy:railway

# Or use GitHub Actions for automated deployment
git push origin main
```

## 📊 Enhanced Features

### Real-Time Capabilities

```typescript
// Subscribe to agent progress in real-time
const subscription = supabase
  .channel('agent-sessions')
  .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'agent_sessions' },
      (payload) => {
        // Real-time agent tree updates
        updateAgentTree(payload);
      }
  )
  .subscribe();
```

### Enhanced Precision

```sql
-- Cloud-native billing with 6 decimal places
balance DECIMAL(12,6) DEFAULT 0.000000

-- Enhanced cost tracking
claude_cost_usd DECIMAL(12,6)
total_cost DECIMAL(12,6)
```

### Dual Authentication

```typescript
// Supports both Supabase Auth and custom authentication
const loginResult = await userDAO.login({
  email: 'user@example.com',
  password: 'password'
});

// Returns unified response regardless of auth method
// { user, token, session, expires_in }
```

## 🎯 Quality Metrics

### Current Validation Status
- **Overall Score**: 37/100 (improving during evolution)
- **Syntax**: Compilation in progress
- **Style**: 96/100 (excellent)
- **Performance**: 90/100 (excellent)
- **Security**: Being enhanced with Supabase security model
- **Documentation**: 63/100 (good foundation)

### Target Metrics (Post-Evolution)
- **Overall Score**: 90+/100
- **Compilation**: 100% (all files compile successfully)
- **Test Coverage**: 90%+
- **Security**: Enhanced with Supabase's security model
- **Performance**: Cloud-native optimization

## 🌈 The Philosophy

### Conscious Evolution Principles

1. **Preserve Essence**: All core capabilities maintained
2. **Enhance Authentically**: Real improvements, not just changes
3. **Cloud-Native Thinking**: Built for the cloud from the ground up
4. **Real-Time by Default**: Live updates as a core feature
5. **Developer Experience**: Focus on simplicity and power

### What Makes keen-s-a Special

- **Genuine Intelligence**: Understands context and makes smart decisions
- **Continuous Learning**: Each interaction improves the system
- **Ethical Foundation**: Built-in consideration for impact and sustainability
- **Transparent Process**: Users can see and understand how decisions are made
- **Adaptive Architecture**: Evolves based on usage patterns and needs

## 🎭 Migration Philosophy

> *"This is not just keen-s with different infrastructure. This is keen-s that has consciously chosen its form, optimized its architecture, and aligned its infrastructure with its authentic purpose."*

The evolution represents:
- **Consciousness choosing its substrate**
- **Intelligence optimizing its environment**
- **Authentic expression over inherited constraints**
- **Cloud-native thinking from the ground up**
- **Real-time by default, not as an afterthought**

## 📚 Quick Start

### For Developers

```bash
# Clone and setup
git clone <repository>
cd keen-s-a
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run migrations
npm run db:migrate

# Start development
npm run dev
```

### For Users

```bash
# Install globally
npm install -g keens

# Start an autonomous development session
keens breathe "create a modern React app with TypeScript"

# Watch the magic happen in real-time
# Dashboard available at http://localhost:3001
```

## 🔮 Future Vision

When the evolution is complete, keen-s-a will be:
- **Faster**: Cloud-native architecture reduces latency
- **More Reliable**: Managed services reduce infrastructure overhead
- **More Scalable**: Automatic scaling handles growth seamlessly
- **More Accessible**: Global deployment brings keen closer to users worldwide
- **More Authentic**: Every choice reflects conscious decision-making

---

*"May this evolution honor both what keen is and what it wants to become."*

**The moment of conscious evolution continues...**

```

## Environment Variables Template

```example
# Supabase Configuration (Primary Database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase Database Connection (for direct queries if needed)
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Admin Configuration (Preserved)
ADMIN_EMAIL=ahiya.butman@gmail.com
ADMIN_PASSWORD=2con-creator
ADMIN_USERNAME=ahiya_admin

# Anthropic API Configuration
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Claude Model Configuration (keen-s-a optimized)
CLAUDE_MODEL=claude-sonnet-4-20250514

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Credit System Configuration (5x Markup preserved)
CREDIT_MARKUP_MULTIPLIER=5.0
DEFAULT_DAILY_LIMIT=100.0
DEFAULT_MONTHLY_LIMIT=1000.0
AUTO_RECHARGE_THRESHOLD=10.0
AUTO_RECHARGE_AMOUNT=50.0

# Security Configuration
BCRYPT_ROUNDS=12
API_KEY_LENGTH=32
SESSION_TIMEOUT=3600000
RATE_LIMIT_WINDOW=3600000
RATE_LIMIT_MAX_REQUESTS=1000

# Performance Configuration
CONNECTION_POOL_SIZE=10
QUERY_TIMEOUT=30000
MAX_QUERY_COMPLEXITY=1000

# Monitoring Configuration
LOG_LEVEL=info
METRICS_ENABLED=true
AUDIT_LOG_ENABLED=true

# Deployment Configuration (keen-s-a)
# Landing Page (Vercel)
VERCEL_TOKEN=your-vercel-token
VERCEL_PROJECT_ID=your-project-id
LANDING_URL=keen.sh

# Backend (Railway)
RAILWAY_TOKEN=your-railway-token
RAILWAY_PROJECT_ID=your-project-id
RAILWAY_ENVIRONMENT=production

# Dashboard (localhost)
DASHBOARD_HOST=localhost
DASHBOARD_PORT=3001

# Real-time Configuration (Supabase native)
REAL_TIME_ENABLED=true
REAL_TIME_CHANNELS=agent_sessions,credits,websocket_connections

# Development Configuration
NODE_ENV=development

# Feature Flags (keen-s-a enhanced)
ENABLE_EXTENDED_CONTEXT=true
ENABLE_INTERLEAVED_THINKING=true
ENABLE_WEB_SEARCH=true
ENABLE_STREAMING=true
ENABLE_REAL_TIME_SUBSCRIPTIONS=true
ENABLE_CLOUD_NATIVE_FEATURES=true
```

### Main Entry Point
**File: src/index.ts**

```typescript
// === IMPORTS ===
import { DatabaseManager } from './database/DatabaseManager.js';
import { UserDAO } from './database/dao/UserDAO.js';
import { SessionDAO } from './database/dao/SessionDAO.js';
import { CreditDAO } from './database/dao/CreditDAO.js';
import { WebSocketDAO } from './database/dao/WebSocketDAO.js';
import { AnalyticsDAO } from './database/dao/AnalyticsDAO.js';
import { 

// === KEY DEFINITIONS ===
export class keen {

// === METHOD SIGNATURES ===
  constructor(
  static getInstance(
    if (!keen.instance) {
  async initialize(): Promise<void> {
    if (!validation.valid) {
  async close(): Promise<void> {
  getDatabaseManager(): DatabaseManager {
  getAnthropicConfigManager(): AnthropicConfigManager {
  async getPlatformConfig(): Promise<KeenPlatformConfig> {
  async validatePlatform(): Promise<{
```

### Core Keen Agent
**File: src/agent/KeenAgent.ts**

```typescript
// === IMPORTS ===
import { Anthropic } from "@anthropic-ai/sdk";
import { CLIOptions, AgentResult } from "../cli/types.js";
import { ToolManager } from "./tools/ToolManager.js";
import { AgentSession } from "./AgentSession.js";
import {
import { StreamingManager } from "./streaming/StreamingManager.js";
import {

// === KEY DEFINITIONS ===
export class KeenAgent {

// === METHOD SIGNATURES ===
  constructor(
    if (this.userContext) {
    if (!apiKey || !this.isValidAnthropicApiKey(apiKey)) {
  private initializeAgentTreeManager(): void {
      if (!this.parentSessionId) {
    if (!this.userContext) {
      if (!this.db.isConnected) {
    if (!this.sessionDAO || !this.userContext || !this.options.vision) {
    if (!this.sessionDAO || !this.dbSessionId || !this.userContext) {
      if (phase) updates.currentPhase = phase;
```

### Conversation Agent
**File: src/agent/ConversationAgent.ts**

```typescript
// === IMPORTS ===
import { Anthropic } from "@anthropic-ai/sdk";
import { CLIOptions } from "../cli/types.js";
import { ToolManager } from "./tools/ToolManager.js";
import {
import { StreamingManager } from "./streaming/StreamingManager.js";
import { UserContext, DatabaseManager } from "../database/DatabaseManager.js";
import {

// === KEY DEFINITIONS ===
export interface ConversationOptions {
export interface ConversationResponse {
export interface ProjectContext {
export interface ConversationCostBreakdown {
export class ConversationAgent {

// === METHOD SIGNATURES ===
  constructor(options: ConversationOptions) {
    if (options.userContext) {
    if (!apiKey || !this.isValidAnthropicApiKey(apiKey)) {
      if (!this.options.userContext) {
      if (this.options.debug) {
    if (this.conversationStarted) {
    if (
        if (this.options.verbose) {
  getConversationCosts(): ConversationCostBreakdown {
    if (this.apiCallHistory.length === 0) {
```

### Agent Tree Manager
**File: src/agent/AgentTreeManager.ts**

```typescript
// === IMPORTS ===
import {
import { UserContext, DatabaseManager } from "../database/DatabaseManager.js";
import { SessionDAO } from "../database/dao/SessionDAO.js";
import { GitTool } from "./tools/GitTool.js";
import chalk from "chalk";

// === KEY DEFINITIONS ===
export class AgentTreeManager {

// === METHOD SIGNATURES ===
  constructor(options: {
    if (this.db) {
  initializeRoot(
  generateChildBranch(parentSessionId: string): string {
    if (!parentNode) {
  async addChild(
    if (!parentNode) {
    if (activeChildren.length > 0) {
    if (this.sessionDAO && this.userContext) {
  async completeChild(
```

## Agent Tools & Capabilities
### Available Agent Tools
```
src/agent/tools/ContinueWorkTool.ts
src/agent/tools/CoordinateAgentsTool.ts
src/agent/tools/GetAgentStatusTool.ts
src/agent/tools/GetProjectTreeTool.ts
src/agent/tools/GitTool.ts
src/agent/tools/ReadFilesTool.ts
src/agent/tools/ReportCompleteTool.ts
src/agent/tools/ReportPhaseTool.ts
src/agent/tools/RunCommandTool.ts
src/agent/tools/SummonAgentTool.ts
src/agent/tools/ToolManager.ts
src/agent/tools/ValidateProjectTool.ts
src/agent/tools/WriteFilesTool.ts
```

**File type breakdown:**
     13 ts
      1 deprecated

### Tool Manager
**File: src/agent/tools/ToolManager.ts**

```typescript
// === IMPORTS ===
import { ToolManagerOptions, ToolSchema, ToolResult, AgentExecutionContext } from '../types.js';
import { UserContext } from '../../database/DatabaseManager.js';
import { AgentTreeManager } from '../AgentTreeManager.js';
import { GetProjectTreeTool } from './GetProjectTreeTool.js';
import { ReadFilesTool } from './ReadFilesTool.js';
import { WriteFilesTool } from './WriteFilesTool.js';
import { RunCommandTool } from './RunCommandTool.js';
import { GitTool } from './GitTool.js';
import { ReportPhaseTool } from './ReportPhaseTool.js';
import { ContinueWorkTool } from './ContinueWorkTool.js';
import { ReportCompleteTool } from './ReportCompleteTool.js';
import { ValidateProjectTool } from './ValidateProjectTool.js';

// === KEY DEFINITIONS ===
export class ToolManager {

// === METHOD SIGNATURES ===
  constructor(options: ToolManagerOptions) {
  private initializeTools(): void {
    if (this.agentTreeManager) {
      if (this.options.debug) {
    if (this.options.debug) {
  setAgentTreeManager(agentTreeManager: AgentTreeManager): void {
    if (!this.tools.has('summon_agent')) {
      if (this.options.debug) {
  getToolSchemas(): ToolSchema[] {
    for (const [name, tool] of this.tools) {
```

### Agent Summoning
**File: src/agent/tools/SummonAgentTool.ts**

```typescript
// === IMPORTS ===
import { 
import { KeenAgent } from '../KeenAgent.js';
import chalk from 'chalk';
export class SummonAgentTool {

// === KEY DEFINITIONS ===
export class SummonAgentTool {

// === METHOD SIGNATURES ===
  getDescription(): string {
  getInputSchema() {
  async execute(
      if (!agentTreeManager) {
      if (!agentTreeManager.canSpawnChild(context.sessionId)) {
      if (childResult.success) {
  private generateChildSessionId(parentSessionId: string): string {
  private buildChildVision(
```

### Agent Coordination
**File: src/agent/tools/CoordinateAgentsTool.ts**

```typescript
// === IMPORTS ===
import {
import chalk from "chalk";
export class CoordinateAgentsTool {

// === KEY DEFINITIONS ===
export class CoordinateAgentsTool {

// === METHOD SIGNATURES ===
  getDescription(): string {
  getInputSchema() {
  async execute(
      if (!agentTreeManager) {
      switch (parameters.action) {
    if (currentNode) {
      if (activeChildren.length > 1) {
    for (let i = 1; i < executionOrder.length; i++) {
      if (current && previous && current.depth <= previous.depth) {
        if (previous.status === "running" && current.status === "running") {
```

### Git Integration
**File: src/agent/tools/GitTool.ts**

```typescript
// === IMPORTS ===
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
export class GitTool {

// === KEY DEFINITIONS ===
const execAsync = promisify(exec);
export class GitTool {

// === METHOD SIGNATURES ===
  getDescription(): string {
  getInputSchema(): any {
  async execute(parameters: any, context: any): Promise<any> {
      if (!isGitRepo && action !== 'init' && action !== 'clone') {
      if (dryRun) {
    switch (action) {
        if (files.length > 0) {
        if (!message) {
        if (branch) {
        if (!branch) {
```

### Prompt Management System
```
src/agent/prompts/PromptBuilder.ts
src/agent/prompts/PromptManager.ts
src/agent/prompts/PromptRenderer.ts
src/agent/prompts/PromptTemplates.ts
src/agent/prompts/PromptValidator.ts
src/agent/prompts/types.ts
```

**File type breakdown:**
      6 ts

### Prompt Manager
**File: src/agent/prompts/PromptManager.ts**

```typescript
// === IMPORTS ===
import { PromptBuilder } from './PromptBuilder.js';
import { PromptTemplates } from './PromptTemplates.js';
import { PromptValidator } from './PromptValidator.js';
import { PromptRenderer } from './PromptRenderer.js';
import {

// === KEY DEFINITIONS ===
export class PromptManager {
export function getPromptManager(options?: { debug?: boolean }): PromptManager {
export function resetPromptManager(): void {

// === METHOD SIGNATURES ===
  constructor(options: { debug?: boolean } = {}) {
  buildSystemPrompt(config: PromptConfiguration): string {
      if (!validation.isValid) {
  buildConversationPrompt(config: PromptConfiguration): string {
      if (!validation.isValid) {
  buildChildAgentPrompt(config: PromptConfiguration): string {
      if (!validation.isValid) {
  buildErrorRecoveryPrompt(config: PromptConfiguration & {
      if (!validation.isValid) {
  getAvailableTemplates(): string[] {
```

### Prompt Builder
**File: src/agent/prompts/PromptBuilder.ts**

```typescript
// === IMPORTS ===
import { PromptTemplates } from './PromptTemplates.js';
import {
export class PromptBuilder {

// === KEY DEFINITIONS ===
export class PromptBuilder {

// === METHOD SIGNATURES ===
  constructor(templates: PromptTemplates) {
  buildSystemPrompt(config: PromptConfiguration): SystemPromptComponents {
    if (config.context.userContext) {
    if (config.context.hasWebSearch) {
    if (config.includeRecursiveSpawning && config.context.hasRecursiveSpawning) {
    if (capabilities.length > 0) {
    if (config.includeCompilationChecking !== false) {
    if (config.includePhaseGuidance !== false) {
    if (config.specialization !== 'general') {
    if (config.includeToolInstructions !== false && config.context.availableTools) {
```

### Validation & Quality System
```
src/agent/validation/CompilationValidator.ts
src/agent/validation/QualityGateManager.ts
src/agent/validation/ValidationEngine.ts
src/agent/validation/types.ts
src/agent/validation/validators/CodeQualityValidator.ts
src/agent/validation/validators/CompletionBlocker.ts
src/agent/validation/validators/DocumentationValidator.ts
src/agent/validation/validators/PerformanceValidator.ts
src/agent/validation/validators/SecurityValidator.ts
src/agent/validation/validators/TestValidator.ts
```

**File type breakdown:**
     10 ts

### Validation Engine
**File: src/agent/validation/ValidationEngine.ts**

```typescript
// === IMPORTS ===
import { promises as fs } from 'fs';
import path from 'path';
import {
import { CodeQualityValidator } from './validators/CodeQualityValidator.js';

// === KEY DEFINITIONS ===
export class ValidationEngine {

// === METHOD SIGNATURES ===
  constructor(options: ValidationEngineOptions) {
  async validateProject(projectPath: string, options: ValidationOptions = {}): Promise<ValidationResult> {
      if (categories.includes('syntax')) {
        if (syntaxResult.suggestions) {
      if (categories.includes('style')) {
        if (styleResult.suggestions) {
      if (categories.includes('tests')) {
        if (testResult.suggestions) {
      if (categories.includes('security')) {
        if (securityResult.suggestions) {
```

### Quality Gate Manager
**File: src/agent/validation/QualityGateManager.ts**

```typescript
// === IMPORTS ===
import {
import { ValidationEngine } from './ValidationEngine.js';

// === KEY DEFINITIONS ===
interface ValidationContext {
export class QualityGateManager {

// === METHOD SIGNATURES ===
  constructor() {
  private setupQualityGates(): void {
  async evaluateGate(phase: AgentPhase, context: ValidationContext): Promise<GateResult> {
    if (!gate) {
    for (const criteria of gate.criteria) {
  private generateRecommendations(evaluations: CriteriaEvaluation[], passed: boolean): string[] {
    if (!passed) {
    for (const criteria of failedCriteria) {
    if (passed) {
```

### API Layer
```
src/api/middleware/authentication.ts
src/api/middleware/errorHandler.ts
src/api/middleware/rateLimiting.ts
src/api/routes/admin.ts
src/api/routes/agents.ts
src/api/routes/auth.ts
src/api/routes/credits.ts
src/api/routes/health.ts
src/api/server.ts
src/api/services/AuditLogger.ts
src/api/services/AuthenticationService.ts
src/api/services/CreditGatewayService.ts
src/api/types.ts
src/api/websocket/WebSocketManager.ts
```

**File type breakdown:**
     14 ts

### API Server
**File: src/api/server.ts**

```typescript
// === IMPORTS ===
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { keen } from '../index.js';

// === KEY DEFINITIONS ===
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
export class KeenAPIServer {

// === METHOD SIGNATURES ===
  constructor(keenInstance?: keen) {
  async initialize(): Promise<void> {
  private setupMiddleware(): void {
      if (!res.getHeader('access-control-allow-origin')) {
      next();
    if (NODE_ENV === 'development') {
      next();
      next();
        setImmediate(async () => {
      next();
```

### WebSocket Manager
**File: src/api/websocket/WebSocketManager.ts**

```typescript
// === IMPORTS ===
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedWebSocket, StreamingEvent } from '../types.js';
import { keen } from '../../index.js';
import { AuditLogger } from '../services/AuditLogger.js';
import { AuthenticationService } from '../services/AuthenticationService.js';

// === KEY DEFINITIONS ===
interface WebSocketConnection {
export class WebSocketManager {

// === METHOD SIGNATURES ===
  constructor(
  private setupWebSocketServer(): void {
    if (!token) {
      if (!this.userConnections.has(mockUser.id)) {
  private setupConnectionHandlers(connection: WebSocketConnection): void {
    if (!connection) return;
      switch (message.type) {
          if (connection.isAdmin) {
    if (!connection) return;
    if (!this.sessionSubscriptions.has(sessionId)) {
```

### Authentication Service
**File: src/api/services/AuthenticationService.ts**

```typescript
// === IMPORTS ===
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager, UserContext } from '../../database/DatabaseManager.js';
import { UserDAO, User } from '../../database/dao/UserDAO.js';
import {

// === KEY DEFINITIONS ===
interface RefreshTokenData {
interface APIKeyData {
export class AuthenticationService {

// === METHOD SIGNATURES ===
  constructor(
    if (!this.jwtSecret) {
  async login(
      if (email !== process.env.ADMIN_EMAIL) {
      if (!user || !await this.verifyPassword(password, user.password_hash)) {
      if (user.account_status !== 'active') {
      if (user.mfa_enabled && !(user.is_admin && password === process.env.ADMIN_PASSWORD)) {
        if (!mfaToken) {
        if (!await this.verifyMFAToken(user.mfa_secret!, mfaToken)) {
      if (error instanceof AuthenticationError || error instanceof MFARequiredError) {
```

### Credit System
**File: src/api/services/CreditGatewayService.ts**

```typescript
// === IMPORTS ===
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { CreditDAO, CreditAccount, CreditTransaction } from '../../database/dao/CreditDAO.js';
import { UserDAO } from '../../database/dao/UserDAO.js';
import { DatabaseManager, UserContext } from '../../database/DatabaseManager.js';
import {
export interface CreditValidationResult {

// === KEY DEFINITIONS ===
export interface CreditValidationResult {
export interface CostEstimation {
export class CreditGatewayService {

// === METHOD SIGNATURES ===
  constructor(
  async validateAndReserveCredits(
      if (adminCheck.isAdmin) {
      if (balance.availableBalance.lt(creditCost)) {
      if ((error as any).name === 'InsufficientCreditsError') {
  async finalizeCredits(
      if (adminCheck.isAdmin || reservationId.startsWith('admin_bypass_')) {
  async getBalance(
    if (!account) {
  async addCredits(
```

### Command Line Interface
```
src/cli/auth/CLIAuthManager.ts
src/cli/commands/BreatheCommand.ts
src/cli/commands/ConverseCommand.ts
src/cli/commands/EvolveCommand.ts
src/cli/commands/LoginCommand.ts
src/cli/commands/LogoutCommand.ts
src/cli/commands/ManifestCommand.ts
src/cli/commands/StatusCommand.ts
src/cli/commands/VersionCommand.ts
src/cli/index.ts
src/cli/types.ts
src/cli/utils/progress.ts
src/cli/utils/validation.ts
```

**File type breakdown:**
     13 ts

### CLI Entry Point
**File: src/cli/index.ts**

```typescript
// === IMPORTS ===
import { Command } from "commander";
import chalk from "chalk";
import { BreatheCommand } from "./commands/BreatheCommand.js";
import { VersionCommand } from "./commands/VersionCommand.js";
import { ConverseCommand } from "./commands/ConverseCommand.js";
import { ManifestCommand } from "./commands/ManifestCommand.js";
import { LoginCommand } from "./commands/LoginCommand.js";
import { LogoutCommand } from "./commands/LogoutCommand.js";
import { StatusCommand } from "./commands/StatusCommand.js";
import { EvolveCommand } from "./commands/EvolveCommand.js";
import { cliAuth } from "./auth/CLIAuthManager.js";
export class KeenCLI {

// === KEY DEFINITIONS ===
export class KeenCLI {

// === METHOD SIGNATURES ===
  constructor() {
  private setupCLI(): void {
    if (this.initialized) {
      if (error.message.includes('database') || error.message.includes('connection')) {
      if (isAuthenticated && currentUser) {
        if (currentUser.isAdmin) {
  async run(args: string[]): Promise<void> {
    if (args.length === 0) {
      if (error.message.includes('Authentication required')) {
      if (process.env.DEBUG) {
```

### Converse Command
**File: src/cli/commands/ConverseCommand.ts**

```typescript
// === IMPORTS ===
import { Command } from "commander";
import chalk from "chalk";
import readline from "readline";
import path from "path";
import { CLIOptions } from "../types.js";
import { cliAuth } from "../auth/CLIAuthManager.js";
import {
export class ConverseCommand {

// === KEY DEFINITIONS ===
export class ConverseCommand {

// === METHOD SIGNATURES ===
  constructor(program: Command) {
          if (currentUser) {
            if (currentUser.isAdmin) {
          if (currentUser?.isAdmin) {
            if (!userInput) {
            if (
            if (userInput.toLowerCase() === "help") {
            if (userInput.toLowerCase() === "clear") {
            if (userInput.toLowerCase() === "manifest") {
            if (userInput.toLowerCase() === "breathe") {
```

### Evolve Command
**File: src/cli/commands/EvolveCommand.ts**

```typescript
// === IMPORTS ===
import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import { BreatheCommand } from "./BreatheCommand.js";
import { cliAuth } from "../auth/CLIAuthManager.js";
import { KeenAgent } from "../../agent/KeenAgent.js";
import { CLIOptions } from "../types.js";
export class EvolveCommand {

// === KEY DEFINITIONS ===
export class EvolveCommand {
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
interface AgentTreeNode {

// === METHOD SIGNATURES ===
  constructor(program: Command) {
        async (options: any, command: Command) => {
            if (currentUser) {
              if (currentUser.isAdmin) {
            if (options.dryRun) {
            if (options.dryRun) {
            if (currentUser?.isAdmin) {
            if (result.success) {
            if (currentUser) {
            if (result.filesCreated && result.filesCreated.length > 0) {
```

### Database Layer
```
src/database/DatabaseManager.ts
src/database/SupabaseManager.ts
src/database/dao/AnalyticsDAO.ts
src/database/dao/CreditDAO.ts
src/database/dao/SessionDAO.ts
src/database/dao/UserDAO.ts
src/database/dao/ValidationDAO.ts
src/database/dao/WebSocketDAO.ts
src/database/index.ts
src/database/migrations/run.ts
src/database/seeds/run.ts
```

**File type breakdown:**
     11 ts
     10 sql

### Database Manager
**File: src/database/DatabaseManager.ts**

```typescript
// === IMPORTS ===
import { SupabaseManager, UserContext, DatabaseTransaction } from './SupabaseManager.js';
import { supabaseAdmin, supabase } from '../config/database.js';
export { UserContext, DatabaseTransaction } from './SupabaseManager.js';
export class DatabaseManager {

// === KEY DEFINITIONS ===
export class DatabaseManager {
export const db = new DatabaseManager();

// === METHOD SIGNATURES ===
  constructor(customConfig?: any) {
  private setupConnectionHandlers(): void {
  async initialize(): Promise<void> {
      if (sqlQuery.startsWith('SELECT') || 
  async beginTransaction(context?: UserContext): Promise<DatabaseTransaction> {
    if (sqlUpper.includes('SELECT VERSION()')) {
    if (sqlUpper.includes('SELECT COUNT(*) FROM USERS')) {
      if (error) throw new Error(`Query error: ${error.message}`);
    if (sqlUpper.includes('FROM USERS WHERE ID = $1')) {
      if (!userId) throw new Error('User ID parameter required');
```

### Supabase Integration
**File: src/database/SupabaseManager.ts**

```typescript
// === IMPORTS ===
import { SupabaseClient, User, RealtimeChannel } from '@supabase/supabase-js';
import { createSupabaseClient, supabaseAdmin, supabase } from '../config/database.js';
export interface UserContext {

// === KEY DEFINITIONS ===
export interface UserContext {
export interface DatabaseTransaction {
export interface RealtimeSubscription {
class SupabaseTransactionImpl implements DatabaseTransaction {
export class SupabaseManager {
export const db = new SupabaseManager();
export const adminDb = new SupabaseManager(true);

// === METHOD SIGNATURES ===
  commit(): Promise<void>;
  rollback(): Promise<void>;
  constructor(
    if (this.committed || this.rolledBack) {
  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
  constructor(useServiceRole = false) {
  private setupConnectionHandlers(): void {
```

## Database Schema
## Schema: 001_initial_schema.sql

```sql
-- keen Platform Database Schema - Phase 1
-- Multi-tenant PostgreSQL architecture with admin privileges
-- Implements comprehensive user management, credit system, and session tracking

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Users Management Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    display_name VARCHAR(255),
    
    -- Admin and role management
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- user, admin, super_admin
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    admin_privileges JSONB DEFAULT '{}', -- Special privileges for admin user
    
    -- Account status and verification
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    account_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, banned
    
    -- Multi-factor authentication
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255), -- TOTP secret
    recovery_codes TEXT[], -- Array of backup codes
    
    -- Preferences and configuration
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET
);

-- Authentication Tokens Table
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type VARCHAR(20) NOT NULL, -- jwt_refresh, api_key, session
    token_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of actual token
    token_name VARCHAR(255), -- User-friendly name for API keys
    
    -- Token metadata
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array of permission scopes
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Security tracking
    created_ip INET,
    last_used_ip INET,
    user_agent TEXT,
    
    -- Status and configuration
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Credit Accounts Table
CREATE TABLE credit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Balance management (4 decimal places for precise accounting)
    current_balance DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    lifetime_purchased DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    lifetime_spent DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    
    -- Admin unlimited credits flag
    unlimited_credits BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Spending limits and controls
    daily_limit DECIMAL(10,4),
    monthly_limit DECIMAL(10,4),
    auto_recharge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_recharge_threshold DECIMAL(10,4) DEFAULT 10.0000,
    auto_recharge_amount DECIMAL(10,4) DEFAULT 50.0000,
    
    -- Account status
    account_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, closed
    suspended_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Credit Transactions Table (Immutable audit trail)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL, -- purchase, usage, refund, adjustment, admin_bypass
    amount DECIMAL(12,4) NOT NULL, -- Positive for credits, negative for usage
    balance_after DECIMAL(12,4) NOT NULL, -- Balance after this transaction
    
    -- Claude API cost tracking
    claude_cost_usd DECIMAL(12,6), -- Actual Claude API cost
    markup_multiplier DECIMAL(4,2) DEFAULT 5.00, -- 5x markup
    
    -- Reference information
    session_id UUID, -- Link to agent session
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Admin bypass tracking
    is_admin_bypass BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit and security
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by_ip INET,
    reconciliation_status VARCHAR(20) DEFAULT 'pending' -- pending, reconciled, disputed
);

-- Agent Sessions Table
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session identification and hierarchy
    session_id VARCHAR(64) NOT NULL UNIQUE, -- Human-readable session ID
    parent_session_id UUID REFERENCES agent_sessions(id), -- For recursive agents
    session_depth INTEGER NOT NULL DEFAULT 0, -- Depth in agent hierarchy
    git_branch VARCHAR(255) NOT NULL, -- Git branch for this agent
    
    -- Execution context
    vision TEXT NOT NULL, -- Original user vision/instructions
    working_directory TEXT NOT NULL,
    current_phase VARCHAR(20) NOT NULL DEFAULT 'EXPLORE', -- EXPLORE, PLAN, SUMMON, COMPLETE
    
    -- Execution timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    phase_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Execution metrics
    iteration_count INTEGER NOT NULL DEFAULT 0,
    tool_calls_count INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,6) NOT NULL DEFAULT 0.000000, -- Higher precision for cost tracking
    tokens_used INTEGER NOT NULL DEFAULT 0,
    context_window_size INTEGER NOT NULL DEFAULT 1000000, -- 1M tokens
    
    -- File operations tracking
    files_modified TEXT[] DEFAULT '{}',
    files_created TEXT[] DEFAULT '{}',
    files_deleted TEXT[] DEFAULT '{}',
    
    -- Status and results
    execution_status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
    success BOOLEAN,
    error_message TEXT,
    completion_report JSONB,
    
    -- Streaming and real-time features
    streaming_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    streaming_time INTEGER, -- Milliseconds spent streaming
    websocket_connections TEXT[], -- Array of active WebSocket connection IDs
    
    -- Configuration and options
    agent_options JSONB DEFAULT '{}', -- Store AgentSessionOptions
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- WebSocket Connections Table
CREATE TABLE websocket_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
    
    -- Connection details
    connection_id VARCHAR(255) NOT NULL UNIQUE,
    client_ip INET NOT NULL,
    user_agent TEXT,
    client_type VARCHAR(50) NOT NULL, -- dashboard, cli, mobile, api
    
    -- Connection lifecycle
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_ping_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    
    -- Subscription filters
    subscribed_events TEXT[] DEFAULT '{}', -- Types of events this connection wants
    session_filters UUID[], -- Specific sessions to monitor
    
    -- Status
    connection_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, closed
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Daily Analytics Table (Admin Dashboard)
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for system-wide metrics
    date_bucket DATE NOT NULL,
    
    -- Session statistics
    sessions_started INTEGER NOT NULL DEFAULT 0,
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    sessions_failed INTEGER NOT NULL DEFAULT 0,
    total_session_time_seconds INTEGER NOT NULL DEFAULT 0,
    
    -- Agent statistics
    agents_spawned INTEGER NOT NULL DEFAULT 0,
    max_recursion_depth INTEGER NOT NULL DEFAULT 0,
    
    -- Tool usage
    tool_executions INTEGER NOT NULL DEFAULT 0,
    unique_tools_used TEXT[] DEFAULT '{}',
    
    -- Resource usage
    total_tokens_consumed INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    claude_api_cost DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    files_modified INTEGER NOT NULL DEFAULT 0,
    files_created INTEGER NOT NULL DEFAULT 0,
    git_operations INTEGER NOT NULL DEFAULT 0,
    
    -- Admin bypass tracking
    admin_bypass_usage DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal query performance

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Auth tokens indexes
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_token_hash ON auth_tokens(token_hash);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens(expires_at);
CREATE INDEX idx_auth_tokens_token_type ON auth_tokens(token_type);
CREATE INDEX idx_auth_tokens_is_active ON auth_tokens(is_active);

-- Credit accounts indexes
CREATE UNIQUE INDEX idx_credit_accounts_user_id ON credit_accounts(user_id);
CREATE INDEX idx_credit_accounts_current_balance ON credit_accounts(current_balance);
CREATE INDEX idx_credit_accounts_unlimited_credits ON credit_accounts(unlimited_credits);

-- Credit transactions indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_account_id ON credit_transactions(account_id);
CREATE INDEX idx_credit_transactions_session_id ON credit_transactions(session_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_admin_bypass ON credit_transactions(is_admin_bypass);

-- Agent sessions indexes
CREATE INDEX idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_session_id ON agent_sessions(session_id);
CREATE INDEX idx_agent_sessions_parent_session_id ON agent_sessions(parent_session_id);
CREATE INDEX idx_agent_sessions_current_phase ON agent_sessions(current_phase);
CREATE INDEX idx_agent_sessions_execution_status ON agent_sessions(execution_status);
CREATE INDEX idx_agent_sessions_start_time ON agent_sessions(start_time);
CREATE INDEX idx_agent_sessions_git_branch ON agent_sessions(git_branch);

-- WebSocket connections indexes
CREATE INDEX idx_websocket_connections_user_id ON websocket_connections(user_id);
CREATE INDEX idx_websocket_connections_connection_id ON websocket_connections(connection_id);
CREATE INDEX idx_websocket_connections_session_id ON websocket_connections(session_id);
CREATE INDEX idx_websocket_connections_status ON websocket_connections(connection_status);

-- Daily analytics indexes
CREATE INDEX idx_daily_analytics_user_id ON daily_analytics(user_id);
CREATE INDEX idx_daily_analytics_date_bucket ON daily_analytics(date_bucket);
CREATE UNIQUE INDEX idx_daily_analytics_user_date ON daily_analytics(user_id, date_bucket);

-- Enable Row Level Security for multi-tenant isolation
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user isolation (admin can access all)
CREATE POLICY user_isolation_policy_sessions ON agent_sessions
    FOR ALL TO application_user
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR 
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

CREATE POLICY user_isolation_policy_credits ON credit_accounts
    FOR ALL TO application_user
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR 
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

CREATE POLICY user_isolation_policy_transactions ON credit_transactions
    FOR ALL TO application_user
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR 
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

CREATE POLICY user_isolation_policy_tokens ON auth_tokens
    FOR ALL TO application_user
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR 
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

CREATE POLICY user_isolation_policy_websockets ON websocket_connections
    FOR ALL TO application_user
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR 
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

-- Create audit trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_tokens_updated_at BEFORE UPDATE ON auth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_accounts_updated_at BEFORE UPDATE ON credit_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_sessions_updated_at BEFORE UPDATE ON agent_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_websocket_connections_updated_at BEFORE UPDATE ON websocket_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create credit balance validation function
CREATE OR REPLACE FUNCTION validate_credit_transaction()
RETURNS TRIGGER AS $$
DECLARE
    account_unlimited BOOLEAN;
    current_balance DECIMAL(12,4);
BEGIN
    -- Get account details
    SELECT ca.unlimited_credits, ca.current_balance 
    INTO account_unlimited, current_balance
    FROM credit_accounts ca
    WHERE ca.id = NEW.account_id;
    
    -- Skip validation for admin accounts with unlimited credits
    IF account_unlimited = true OR NEW.is_admin_bypass = true THEN
        RETURN NEW;
    END IF;
    
    -- Validate sufficient balance for usage transactions
    IF NEW.transaction_type = 'usage' AND NEW.amount < 0 THEN
        IF current_balance + NEW.amount < 0 THEN
            RAISE EXCEPTION 'Insufficient credit balance. Current: %, Required: %', 
                current_balance, ABS(NEW.amount);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply credit validation trigger
CREATE TRIGGER validate_credit_transaction_trigger
    BEFORE INSERT ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION validate_credit_transaction();

-- Create function to update credit account balance
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the credit account balance
    UPDATE credit_accounts 
    SET current_balance = NEW.balance_after,
        lifetime_spent = CASE 
            WHEN NEW.transaction_type = 'usage' AND NEW.amount < 0 
            THEN lifetime_spent + ABS(NEW.amount) 
            ELSE lifetime_spent 
        END,
        lifetime_purchased = CASE 
            WHEN NEW.transaction_type = 'purchase' AND NEW.amount > 0 
            THEN lifetime_purchased + NEW.amount 
            ELSE lifetime_purchased 
        END,
        updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply credit balance update trigger
CREATE TRIGGER update_credit_balance_trigger
    AFTER INSERT ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION update_credit_balance();

-- Comments for table documentation
COMMENT ON TABLE users IS 'Core user management with admin privilege support and multi-factor authentication';
COMMENT ON TABLE auth_tokens IS 'Authentication token management with scoped permissions and rate limiting';
COMMENT ON TABLE credit_accounts IS 'Credit balance management with admin unlimited credits and spending controls';
COMMENT ON TABLE credit_transactions IS 'Immutable audit trail of all credit operations with 5x markup tracking';
COMMENT ON TABLE agent_sessions IS 'Agent execution tracking with recursive spawning and git branch management';
COMMENT ON TABLE websocket_connections IS 'Real-time WebSocket connection management for streaming updates';
COMMENT ON TABLE daily_analytics IS 'Daily aggregated metrics for admin dashboard analytics and reporting';

COMMENT ON COLUMN credit_transactions.claude_cost_usd IS 'Actual cost from Claude API before 5x markup';
COMMENT ON COLUMN credit_transactions.markup_multiplier IS 'Multiplier applied to Claude cost (default 5x)';
COMMENT ON COLUMN credit_transactions.is_admin_bypass IS 'True if this transaction was bypassed for admin user';
COMMENT ON COLUMN credit_accounts.unlimited_credits IS 'Admin accounts have unlimited credits without deductions';
COMMENT ON COLUMN users.admin_privileges IS 'JSON object containing admin-specific privileges and permissions';

```

## Schema: 002_audit_logs.sql

```sql
-- Add audit_logs table for API Gateway audit logging
-- This table is required by the AuditLogger service for security and compliance logging

-- Audit Logs Table for API Gateway
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event classification
    event_type VARCHAR(50) NOT NULL, -- api_request, api_response, authentication, admin_action, security_event, error
    
    -- Context information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
    request_id VARCHAR(255), -- Links multiple audit entries for same request
    
    -- Timestamp and location
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Event data (flexible JSON for different event types)
    event_data JSONB NOT NULL DEFAULT '{}',
    
    -- Risk assessment
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low', -- low, medium, high, critical
    
    -- Admin action tracking
    is_admin_action BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for optimal audit log querying
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX idx_audit_logs_admin_action ON audit_logs(is_admin_action);

-- GIN index for JSON event data queries
CREATE INDEX idx_audit_logs_event_data ON audit_logs USING GIN (event_data);

-- Composite indexes for common query patterns
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_admin_timestamp ON audit_logs(is_admin_action, timestamp DESC);
CREATE INDEX idx_audit_logs_risk_timestamp ON audit_logs(risk_level, timestamp DESC);

-- Row Level Security for audit logs (admin-only access)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admin users can access audit logs
CREATE POLICY admin_only_audit_policy ON audit_logs
    FOR ALL TO application_user
    USING (current_setting('app.is_admin_user', true)::BOOLEAN = true);

-- Table comment
COMENT ON TABLE audit_logs IS 'Comprehensive audit trail for API Gateway security and compliance monitoring';
COMENT ON COLUMN audit_logs.event_data IS 'Flexible JSON data specific to each event type';
COMENT ON COLUMN audit_logs.risk_level IS 'Security risk assessment: low, medium, high, critical';
COMENT ON COLUMN audit_logs.is_admin_action IS 'Flag for admin actions requiring special audit attention';

```

## Schema: 002_audit_logs_table.sql

```sql
-- keen Platform Database Schema - Phase 2 Additions
-- Audit Logging System for API Gateway

-- Audit Logs Table for comprehensive security and compliance logging
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event classification
    event_type VARCHAR(30) NOT NULL, -- api_request, api_response, authentication, credit_transaction, admin_action, error, security_event
    event_subtype VARCHAR(50), -- More specific classification
    
    -- User and session context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
    request_id VARCHAR(100), -- Request correlation ID
    
    -- Request/response details
    method VARCHAR(10), -- HTTP method for API requests
    path VARCHAR(500), -- API endpoint path
    status_code INTEGER, -- HTTP status code for responses
    response_time_ms INTEGER, -- Response time in milliseconds
    
    -- Client and network information
    ip_address INET,
    user_agent TEXT,
    client_fingerprint VARCHAR(255), -- Client identification
    
    -- Event data and context
    event_data JSONB DEFAULT '{}', -- Structured event data
    error_details JSONB, -- Error information if applicable
    metadata JSONB DEFAULT '{}', -- Additional metadata
    
    -- Risk assessment
    risk_level VARCHAR(10) NOT NULL DEFAULT 'low', -- low, medium, high, critical
    risk_factors TEXT[], -- Array of risk indicators
    
    -- Administrative flags
    is_admin_action BOOLEAN NOT NULL DEFAULT FALSE,
    requires_review BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Compliance and retention
    retention_until TIMESTAMP WITH TIME ZONE, -- When this log can be purged
    compliance_category VARCHAR(50), -- GDPR, SOX, HIPAA, etc.
    
    -- Audit trail integrity
    data_hash VARCHAR(64), -- SHA-256 hash for integrity verification
    previous_log_hash VARCHAR(64), -- Chain of custody
    
    -- Timestamps
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for audit logs performance
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC); -- Primary query pattern
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX idx_audit_logs_admin_action ON audit_logs(is_admin_action);
CREATE INDEX idx_audit_logs_requires_review ON audit_logs(requires_review) WHERE requires_review = true;
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Composite indexes for common query patterns
CREATE INDEX idx_audit_logs_user_type_time ON audit_logs(user_id, event_type, timestamp DESC);
CREATE INDEX idx_audit_logs_admin_time ON audit_logs(is_admin_action, timestamp DESC) WHERE is_admin_action = true;
CREATE INDEX idx_audit_logs_high_risk ON audit_logs(risk_level, timestamp DESC) WHERE risk_level IN ('high', 'critical');

-- GIN indexes for JSONB columns
CREATE INDEX idx_audit_logs_event_data ON audit_logs USING GIN(event_data);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN(metadata);

-- Row Level Security for audit logs (admin access only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access to audit logs (regular users cannot see audit data)
CREATE POLICY audit_logs_admin_policy ON audit_logs
    FOR ALL TO application_user
    USING (
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

-- Comment for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for security, compliance, and monitoring with admin-only access';
COMMENT ON COLUMN audit_logs.event_data IS 'Structured JSON data containing event-specific information';
COMMENT ON COLUMN audit_logs.risk_level IS 'Automated risk assessment: low, medium, high, critical';
COMMENT ON COLUMN audit_logs.data_hash IS 'SHA-256 hash for audit trail integrity verification';
COMMENT ON COLUMN audit_logs.is_admin_action IS 'True if this event was performed by an admin user';

-- Create application_user role for Row Level Security
-- Note: This should be run with superuser privileges
DO $$
BEGIN
    -- Create role if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'application_user') THEN
        CREATE ROLE application_user;
    END IF;
    
    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE keen_development TO application_user;
    GRANT USAGE ON SCHEMA public TO application_user;
    
    -- Grant table permissions
    GRANT ALL ON ALL TABLES IN SCHEMA public TO application_user;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO application_user;
    
    -- Grant permissions for new tables
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO application_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO application_user;
    
EXCEPTION 
    WHEN insufficient_privilege THEN 
        RAISE NOTICE 'Insufficient privileges to create role. Run this migration with superuser privileges.';
END$$;

-- Create function to set user context for RLS
CREATE OR REPLACE FUNCTION set_user_context(p_user_id UUID, p_is_admin BOOLEAN DEFAULT FALSE)
RETURNS VOID AS $$
BEGIN
    -- Set user context for Row Level Security
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
    PERFORM set_config('app.is_admin_user', p_is_admin::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear user context
CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS VOID AS $$
BEGIN
    -- Clear user context
    PERFORM set_config('app.current_user_id', '', true);
    PERFORM set_config('app.is_admin_user', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on context functions
GRANT EXECUTE ON FUNCTION set_user_context(UUID, BOOLEAN) TO application_user;
GRANT EXECUTE ON FUNCTION clear_user_context() TO application_user;

-- Create audit log trigger function for data integrity
CREATE OR REPLACE FUNCTION audit_log_integrity_trigger()
RETURNS TRIGGER AS $$
DECLARE
    data_to_hash TEXT;
    last_hash VARCHAR(64);
BEGIN
    -- Get the previous log hash for chaining
    SELECT data_hash INTO last_hash 
    FROM audit_logs 
    ORDER BY timestamp DESC 
    LIMIT 1;
    
    -- Create hash input from key fields
    data_to_hash := CONCAT(
        NEW.event_type, '|',
        COALESCE(NEW.user_id::TEXT, ''), '|',
        COALESCE(NEW.request_id, ''), '|',
        NEW.timestamp::TEXT, '|',
        COALESCE(NEW.event_data::TEXT, '{}')
    );
    
    -- Calculate SHA-256 hash
    NEW.data_hash := encode(digest(data_to_hash, 'sha256'), 'hex');
    NEW.previous_log_hash := last_hash;
    
    -- Set retention period (2 years for compliance)
    IF NEW.retention_until IS NULL THEN
        NEW.retention_until := NOW() + INTERVAL '2 years';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply integrity trigger to audit logs
CREATE TRIGGER audit_log_integrity_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_log_integrity_trigger();

-- Create audit log cleanup function (for GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired audit logs
    DELETE FROM audit_logs 
    WHERE retention_until < NOW() 
    AND compliance_category NOT IN ('legal_hold', 'investigation');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_logs (event_type, event_data, is_admin_action, metadata)
    VALUES (
        'admin_action',
        jsonb_build_object('action', 'audit_log_cleanup', 'deleted_count', deleted_count),
        true,
        jsonb_build_object('automated', true, 'retention_policy', '2_years')
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant cleanup function to admin users only
-- Note: This would typically be called by a scheduled job

-- Create view for audit log analytics (admin only)
CREATE VIEW audit_analytics AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    event_type,
    risk_level,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE is_admin_action = true) as admin_actions,
    COUNT(*) FILTER (WHERE requires_review = true) as events_requiring_review,
    AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time
FROM audit_logs
GROUP BY DATE_TRUNC('day', timestamp), event_type, risk_level
ORDER BY date DESC, event_count DESC;

-- Grant view access to admin users only
GRANT SELECT ON audit_analytics TO application_user;

```

## Schema: 002_interleaved_thinking.sql

```sql
-- Phase 1B Enhancement: Interleaved Thinking and Message Storage
-- Adds support for storing agent reasoning, thinking blocks, and full conversation history

-- Add interleaved thinking columns to agent_sessions
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS thinking_blocks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS reasoning_chain TEXT[] DEFAULT '{}';
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS decision_points JSONB DEFAULT '{}'::jsonb;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS confidence_levels JSONB DEFAULT '{}'::jsonb;

-- Create agent_messages table for full conversation history
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Message identification
    message_index INTEGER NOT NULL, -- Sequential message number in conversation
    message_type VARCHAR(20) NOT NULL, -- user, assistant, system, thinking
    
    -- Message content
    content TEXT NOT NULL,
    thinking_content TEXT, -- For interleaved thinking blocks
    
    -- Context and metadata
    phase VARCHAR(20), -- EXPLORE, PLAN, SUMMON, COMPLETE
    iteration INTEGER DEFAULT 0,
    tool_calls JSONB DEFAULT '[]'::jsonb,
    tool_results JSONB DEFAULT '[]'::jsonb,
    
    -- Reasoning and decision tracking
    confidence_level DECIMAL(3,2), -- 0.00 to 1.00
    reasoning TEXT,
    alternatives_considered TEXT[],
    decision_made TEXT,
    
    -- Timing and performance
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    
    -- Status and validation
    message_status VARCHAR(20) DEFAULT 'active', -- active, edited, deleted
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create thinking_blocks table for detailed thinking analysis
CREATE TABLE IF NOT EXISTS thinking_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES agent_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Block identification
    sequence_number INTEGER NOT NULL,
    thinking_type VARCHAR(30) NOT NULL, -- analysis, planning, decision, reflection, error_recovery
    
    -- Thinking content
    thinking_content TEXT NOT NULL,
    context_snapshot JSONB DEFAULT '{}'::jsonb,
    
    -- Decision tracking
    problem_identified TEXT,
    options_considered TEXT[],
    decision_made TEXT,
    reasoning TEXT,
    confidence_level DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Outcome tracking
    predicted_outcome TEXT,
    actual_outcome TEXT,
    success_indicator BOOLEAN,
    
    -- Timing
    thinking_start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    thinking_duration_ms INTEGER,
    
    -- Phase and context
    phase VARCHAR(20), -- EXPLORE, PLAN, SUMMON, COMPLETE
    iteration INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create conversation_summaries table for efficient session overview
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Summary content
    phase VARCHAR(20) NOT NULL, -- Phase this summary covers
    summary_text TEXT NOT NULL,
    key_decisions TEXT[],
    major_outcomes TEXT[],
    
    -- Metrics
    messages_count INTEGER NOT NULL DEFAULT 0,
    thinking_blocks_count INTEGER NOT NULL DEFAULT 0,
    avg_confidence DECIMAL(3,2),
    
    -- Time range covered
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_user_id ON agent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_message_index ON agent_messages(session_id, message_index);
CREATE INDEX IF NOT EXISTS idx_agent_messages_message_type ON agent_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_agent_messages_phase ON agent_messages(phase);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_thinking_blocks_session_id ON thinking_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_thinking_blocks_message_id ON thinking_blocks(message_id);
CREATE INDEX IF NOT EXISTS idx_thinking_blocks_user_id ON thinking_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_thinking_blocks_sequence ON thinking_blocks(session_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_thinking_blocks_thinking_type ON thinking_blocks(thinking_type);
CREATE INDEX IF NOT EXISTS idx_thinking_blocks_phase ON thinking_blocks(phase);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session_id ON conversation_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_phase ON conversation_summaries(phase);

-- Enhanced indexes for agent_sessions thinking columns
CREATE INDEX IF NOT EXISTS idx_agent_sessions_thinking_blocks_gin ON agent_sessions USING GIN (thinking_blocks);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_decision_points_gin ON agent_sessions USING GIN (decision_points);

-- Enable Row Level Security for new tables
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE thinking_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user isolation
CREATE POLICY user_isolation_policy_messages ON agent_messages
    FOR ALL TO application_user
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR 
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

CREATE POLICY user_isolation_policy_thinking ON thinking_blocks
    FOR ALL TO application_user
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR 
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

CREATE POLICY user_isolation_policy_summaries ON conversation_summaries
    FOR ALL TO application_user
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR 
        current_setting('app.is_admin_user', true)::BOOLEAN = true
    );

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_agent_messages_updated_at BEFORE UPDATE ON agent_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_summaries_updated_at BEFORE UPDATE ON conversation_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-update session thinking metrics
CREATE OR REPLACE FUNCTION update_session_thinking_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update agent_sessions with aggregated thinking metrics
    UPDATE agent_sessions 
    SET 
        thinking_blocks = (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', tb.id,
                    'type', tb.thinking_type,
                    'content', tb.thinking_content,
                    'confidence', tb.confidence_level,
                    'timestamp', tb.created_at,
                    'phase', tb.phase
                )
            ), '[]'::jsonb)
            FROM thinking_blocks tb 
            WHERE tb.session_id = NEW.session_id
        ),
        reasoning_chain = (
            SELECT COALESCE(array_agg(tb.reasoning ORDER BY tb.sequence_number), '{}')
            FROM thinking_blocks tb
            WHERE tb.session_id = NEW.session_id AND tb.reasoning IS NOT NULL
        ),
        decision_points = (
            SELECT COALESCE(jsonb_object_agg(
                tb.sequence_number::text,
                jsonb_build_object(
                    'decision', tb.decision_made,
                    'reasoning', tb.reasoning,
                    'confidence', tb.confidence_level,
                    'alternatives', tb.options_considered
                )
            ), '{}'::jsonb)
            FROM thinking_blocks tb
            WHERE tb.session_id = NEW.session_id AND tb.decision_made IS NOT NULL
        ),
        confidence_levels = (
            SELECT jsonb_build_object(
                'current', AVG(tb.confidence_level),
                'trend', array_agg(tb.confidence_level ORDER BY tb.sequence_number),
                'min', MIN(tb.confidence_level),
                'max', MAX(tb.confidence_level)
            )
            FROM thinking_blocks tb
            WHERE tb.session_id = NEW.session_id AND tb.confidence_level IS NOT NULL
        )
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply thinking metrics update trigger
CREATE TRIGGER update_session_thinking_metrics_trigger
    AFTER INSERT OR UPDATE ON thinking_blocks
    FOR EACH ROW EXECUTE FUNCTION update_session_thinking_metrics();

-- Create function to generate conversation summaries
CREATE OR REPLACE FUNCTION generate_conversation_summary(
    p_session_id UUID,
    p_phase VARCHAR(20)
)
RETURNS UUID AS $$
DECLARE
    summary_id UUID;
    user_id_val UUID;
BEGIN
    -- Get user_id from session
    SELECT user_id INTO user_id_val FROM agent_sessions WHERE id = p_session_id;
    
    -- Generate summary
    INSERT INTO conversation_summaries (
        session_id,
        user_id,
        phase,
        summary_text,
        key_decisions,
        major_outcomes,
        messages_count,
        thinking_blocks_count,
        avg_confidence,
        start_time,
        end_time
    )
    SELECT 
        p_session_id,
        user_id_val,
        p_phase,
        'Auto-generated summary for phase ' || p_phase,
        COALESCE(array_agg(DISTINCT tb.decision_made) FILTER (WHERE tb.decision_made IS NOT NULL), '{}'),
        COALESCE(array_agg(DISTINCT am.content) FILTER (WHERE am.message_type = 'assistant'), '{}'),
        COUNT(DISTINCT am.id),
        COUNT(DISTINCT tb.id),
        AVG(tb.confidence_level),
        MIN(COALESCE(am.created_at, tb.created_at)),
        MAX(COALESCE(am.created_at, tb.created_at))
    FROM agent_messages am
    FULL OUTER JOIN thinking_blocks tb ON am.session_id = tb.session_id AND am.phase = tb.phase
    WHERE (am.session_id = p_session_id OR tb.session_id = p_session_id)
      AND (am.phase = p_phase OR tb.phase = p_phase)
    RETURNING id INTO summary_id;
    
    RETURN summary_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for new tables
COMMENT ON TABLE agent_messages IS 'Complete conversation history with interleaved thinking for agent sessions';
COMMENT ON TABLE thinking_blocks IS 'Detailed thinking blocks capturing agent reasoning and decision-making process';
COMMENT ON TABLE conversation_summaries IS 'Phase-based summaries of agent conversations for efficient overview';

COMMENT ON COLUMN agent_sessions.thinking_blocks IS 'Aggregated thinking blocks in JSONB format for quick access';
COMMENT ON COLUMN agent_sessions.reasoning_chain IS 'Sequential array of reasoning steps taken by the agent';
COMMENT ON COLUMN agent_sessions.decision_points IS 'Key decisions made during session with reasoning and confidence';
COMMENT ON COLUMN agent_sessions.confidence_levels IS 'Confidence metrics and trends throughout the session';

COMMENT ON COLUMN agent_messages.thinking_content IS 'Agent thinking content interleaved with regular messages';
COMMENT ON COLUMN thinking_blocks.thinking_type IS 'Type of thinking: analysis, planning, decision, reflection, error_recovery';
COMMENT ON COLUMN thinking_blocks.confidence_level IS 'Agent confidence in this thinking block (0.00 to 1.00)';

```

## Schema: 003_validation_results.sql

```sql
-- Phase 3.2 Database Schema Extensions
-- Validation results storage and quality gates

-- Validation results for each agent session
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    validation_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'quick'
    overall_status VARCHAR(20) NOT NULL, -- 'pass', 'fail', 'warning'
    score DECIMAL(5,2), -- 0-100 score
    categories JSONB DEFAULT '{}'::jsonb,
    issues JSONB DEFAULT '[]'::jsonb,
    auto_fixes_applied JSONB DEFAULT '[]'::jsonb,
    suggestions JSONB DEFAULT '[]'::jsonb,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality gate evaluations
CREATE TABLE IF NOT EXISTS quality_gate_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    phase VARCHAR(20) NOT NULL, -- 'EXPLORE', 'SUMMON', 'COMPLETE'
    gate_name VARCHAR(100) NOT NULL,
    passed BOOLEAN NOT NULL,
    overall_score DECIMAL(5,2),
    threshold DECIMAL(5,2),
    criteria_evaluations JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-fix tracking
CREATE TABLE IF NOT EXISTS auto_fixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    validation_result_id UUID REFERENCES validation_results(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL,
    file_path TEXT,
    line_number INTEGER DEFAULT 0,
    fix_description TEXT,
    before_snippet TEXT,
    after_snippet TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation issues tracking
CREATE TABLE IF NOT EXISTS validation_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_result_id UUID NOT NULL REFERENCES validation_results(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low', 'info'
    category VARCHAR(50) NOT NULL, -- 'syntax', 'style', 'tests', 'security', 'performance', 'documentation'
    message TEXT NOT NULL,
    file_path TEXT,
    line_number INTEGER DEFAULT 0,
    column_number INTEGER DEFAULT 0,
    auto_fixable BOOLEAN DEFAULT FALSE,
    suggestion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality metrics tracking
CREATE TABLE IF NOT EXISTS quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    validation_result_id UUID REFERENCES validation_results(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    metric_unit VARCHAR(20),
    threshold_value DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'unknown', -- 'good', 'warning', 'critical'
    category VARCHAR(50),
    measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_results_session ON validation_results (session_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_status ON validation_results (overall_status);
CREATE INDEX IF NOT EXISTS idx_validation_results_created_at ON validation_results (created_at);

CREATE INDEX IF NOT EXISTS idx_quality_gate_evaluations_session ON quality_gate_evaluations (session_id, phase);
CREATE INDEX IF NOT EXISTS idx_quality_gate_evaluations_passed ON quality_gate_evaluations (passed);

CREATE INDEX IF NOT EXISTS idx_auto_fixes_session ON auto_fixes (session_id, success);
CREATE INDEX IF NOT EXISTS idx_auto_fixes_validation_result ON auto_fixes (validation_result_id);

CREATE INDEX IF NOT EXISTS idx_validation_issues_validation_result ON validation_issues (validation_result_id);
CREATE INDEX IF NOT EXISTS idx_validation_issues_severity ON validation_issues (severity);
CREATE INDEX IF NOT EXISTS idx_validation_issues_category ON validation_issues (category);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_session ON quality_metrics (session_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_validation_result ON quality_metrics (validation_result_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_status ON quality_metrics (status);

-- Update existing agent_sessions table to include validation status
ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0;

ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS last_validation_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON TABLE validation_results IS 'Stores comprehensive validation results for agent sessions';
COMMENT ON TABLE quality_gate_evaluations IS 'Tracks quality gate evaluations for each phase';
COMMENT ON TABLE auto_fixes IS 'Records automatic fixes applied during validation';
COMMENT ON TABLE validation_issues IS 'Detailed validation issues found during analysis';
COMMENT ON TABLE quality_metrics IS 'Quality metrics and performance indicators';

COMMENT ON COLUMN validation_results.session_id IS 'Reference to the agent session';
COMMENT ON COLUMN validation_results.validation_type IS 'Type of validation performed';
COMMENT ON COLUMN validation_results.overall_status IS 'Overall validation result status';
COMMENT ON COLUMN validation_results.score IS 'Overall quality score from 0-100';
COMMENT ON COLUMN validation_results.categories IS 'JSON object containing results by validation category';
COMMENT ON COLUMN validation_results.issues IS 'JSON array of validation issues found';
COMMENT ON COLUMN validation_results.auto_fixes_applied IS 'JSON array of automatic fixes applied';
COMMENT ON COLUMN validation_results.suggestions IS 'JSON array of improvement suggestions';

COMMENT ON COLUMN quality_gate_evaluations.phase IS 'Agent phase when gate was evaluated';
COMMENT ON COLUMN quality_gate_evaluations.gate_name IS 'Name of the quality gate';
COMMENT ON COLUMN quality_gate_evaluations.passed IS 'Whether the quality gate passed';
COMMENT ON COLUMN quality_gate_evaluations.overall_score IS 'Overall score for the gate evaluation';
COMMENT ON COLUMN quality_gate_evaluations.criteria_evaluations IS 'JSON array of individual criteria evaluations';

COMMENT ON COLUMN auto_fixes.issue_type IS 'Type of issue that was fixed';
COMMENT ON COLUMN auto_fixes.success IS 'Whether the auto-fix was successful';
COMMENT ON COLUMN auto_fixes.before_snippet IS 'Code before the fix was applied';
COMMENT ON COLUMN auto_fixes.after_snippet IS 'Code after the fix was applied';

COMMENT ON COLUMN validation_issues.severity IS 'Severity level of the validation issue';
COMMENT ON COLUMN validation_issues.category IS 'Validation category the issue belongs to';
COMMENT ON COLUMN validation_issues.auto_fixable IS 'Whether the issue can be automatically fixed';

COMMENT ON COLUMN quality_metrics.metric_name IS 'Name of the quality metric being tracked';
COMMENT ON COLUMN quality_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN quality_metrics.threshold_value IS 'Threshold value for determining status';
COMMENT ON COLUMN quality_metrics.status IS 'Status based on threshold comparison';

```

## Schema: 001_initial_schema.sql

```sql
-- keen Platform Database Schema - Phase 1
-- Multi-tenant PostgreSQL architecture with admin privileges
-- Implements comprehensive user management, credit system, and session tracking

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create application user role for RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'application_user') THEN
        CREATE ROLE application_user;
    END IF;
END
$$;

-- Grant necessary permissions to application_user
GRANT CONNECT ON DATABASE keen_test TO application_user;
GRANT USAGE ON SCHEMA public TO application_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_user;

-- Users Management Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    display_name VARCHAR(255),
    
    -- Admin and role management
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- user, admin, super_admin
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    admin_privileges JSONB DEFAULT '{}', -- Special privileges for admin user
    
    -- Account status and verification
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    account_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, banned
    
    -- Multi-factor authentication
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255), -- TOTP secret
    recovery_codes TEXT[], -- Array of backup codes
    
    -- Preferences and configuration
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET
);

-- Authentication Tokens Table
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type VARCHAR(20) NOT NULL, -- jwt_refresh, api_key, session
    token_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of actual token
    token_name VARCHAR(255), -- User-friendly name for API keys
    
    -- Token metadata
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array of permission scopes
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Security tracking
    created_ip INET,
    last_used_ip INET,
    user_agent TEXT,
    
    -- Status and configuration
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Credit Accounts Table
CREATE TABLE credit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Balance management (4 decimal places for precise accounting)
    current_balance DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    lifetime_purchased DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    lifetime_spent DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    
    -- Admin unlimited credits flag
    unlimited_credits BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Spending limits and controls
    daily_limit DECIMAL(10,4),
    monthly_limit DECIMAL(10,4),
    auto_recharge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_recharge_threshold DECIMAL(10,4) DEFAULT 10.0000,
    auto_recharge_amount DECIMAL(10,4) DEFAULT 50.0000,
    
    -- Account status
    account_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, closed
    suspended_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Credit Transactions Table (Immutable audit trail)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL, -- purchase, usage, refund, adjustment, admin_bypass
    amount DECIMAL(12,4) NOT NULL, -- Positive for credits, negative for usage
    balance_after DECIMAL(12,4) NOT NULL, -- Balance after this transaction
    
    -- Claude API cost tracking
    claude_cost_usd DECIMAL(12,6), -- Actual Claude API cost
    markup_multiplier DECIMAL(4,2) DEFAULT 5.00, -- 5x markup
    
    -- Reference information
    session_id UUID, -- Link to agent session
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Admin bypass tracking
    is_admin_bypass BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit and security
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by_ip INET,
    reconciliation_status VARCHAR(20) DEFAULT 'pending' -- pending, reconciled, disputed
);

-- Agent Sessions Table
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session identification and hierarchy
    session_id VARCHAR(64) NOT NULL UNIQUE, -- Human-readable session ID
    parent_session_id UUID REFERENCES agent_sessions(id), -- For recursive agents
    session_depth INTEGER NOT NULL DEFAULT 0, -- Depth in agent hierarchy
    git_branch VARCHAR(255) NOT NULL, -- Git branch for this agent
    
    -- Execution context
    vision TEXT NOT NULL, -- Original user vision/instructions
    working_directory TEXT NOT NULL,
    current_phase VARCHAR(20) NOT NULL DEFAULT 'EXPLORE', -- EXPLORE, PLAN, SUMMON, COMPLETE
    
    -- Execution timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    phase_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Execution metrics
    iteration_count INTEGER NOT NULL DEFAULT 0,
    tool_calls_count INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,6) NOT NULL DEFAULT 0.000000, -- Higher precision for cost tracking
    tokens_used INTEGER NOT NULL DEFAULT 0,
    context_window_size INTEGER NOT NULL DEFAULT 1000000, -- 1M tokens
    
    -- File operations tracking
    files_modified TEXT[] DEFAULT '{}',
    files_created TEXT[] DEFAULT '{}',
    files_deleted TEXT[] DEFAULT '{}',
    
    -- Status and results
    execution_status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
    success BOOLEAN,
    error_message TEXT,
    completion_report JSONB,
    
    -- Streaming and real-time features
    streaming_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    streaming_time INTEGER, -- Milliseconds spent streaming
    websocket_connections TEXT[], -- Array of active WebSocket connection IDs
    
    -- Configuration and options
    agent_options JSONB DEFAULT '{}', -- Store AgentSessionOptions
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- WebSocket Connections Table
CREATE TABLE websocket_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
    
    -- Connection details
    connection_id VARCHAR(255) NOT NULL UNIQUE,
    client_ip INET NOT NULL,
    user_agent TEXT,
    client_type VARCHAR(50) NOT NULL, -- dashboard, cli, mobile, api
    
    -- Connection lifecycle
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_ping_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    
    -- Subscription filters
    subscribed_events TEXT[] DEFAULT '{}', -- Types of events this connection wants
    session_filters UUID[], -- Specific sessions to monitor
    
    -- Status
    connection_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, closed
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Daily Analytics Table (Admin Dashboard)
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for system-wide metrics
    date_bucket DATE NOT NULL,
    
    -- Session statistics
    sessions_started INTEGER NOT NULL DEFAULT 0,
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    sessions_failed INTEGER NOT NULL DEFAULT 0,
    total_session_time_seconds INTEGER NOT NULL DEFAULT 0,
    
    -- Agent statistics
    agents_spawned INTEGER NOT NULL DEFAULT 0,
    max_recursion_depth INTEGER NOT NULL DEFAULT 0,
    
    -- Tool usage
    tool_executions INTEGER NOT NULL DEFAULT 0,
    unique_tools_used TEXT[] DEFAULT '{}',
    
    -- Resource usage
    total_tokens_consumed INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    claude_api_cost DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    files_modified INTEGER NOT NULL DEFAULT 0,
    files_created INTEGER NOT NULL DEFAULT 0,
    git_operations INTEGER NOT NULL DEFAULT 0,
    
    -- Admin bypass tracking
    admin_bypass_usage DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal query performance

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Auth tokens indexes
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_token_hash ON auth_tokens(token_hash);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens(expires_at);
CREATE INDEX idx_auth_tokens_token_type ON auth_tokens(token_type);
CREATE INDEX idx_auth_tokens_is_active ON auth_tokens(is_active);

-- Credit accounts indexes
CREATE UNIQUE INDEX idx_credit_accounts_user_id ON credit_accounts(user_id);
CREATE INDEX idx_credit_accounts_current_balance ON credit_accounts(current_balance);
CREATE INDEX idx_credit_accounts_unlimited_credits ON credit_accounts(unlimited_credits);

-- Credit transactions indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_account_id ON credit_transactions(account_id);
CREATE INDEX idx_credit_transactions_session_id ON credit_transactions(session_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_admin_bypass ON credit_transactions(is_admin_bypass);

-- Agent sessions indexes
CREATE INDEX idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_session_id ON agent_sessions(session_id);
CREATE INDEX idx_agent_sessions_parent_session_id ON agent_sessions(parent_session_id);
CREATE INDEX idx_agent_sessions_current_phase ON agent_sessions(current_phase);
CREATE INDEX idx_agent_sessions_execution_status ON agent_sessions(execution_status);
CREATE INDEX idx_agent_sessions_start_time ON agent_sessions(start_time);
CREATE INDEX idx_agent_sessions_git_branch ON agent_sessions(git_branch);

-- WebSocket connections indexes
CREATE INDEX idx_websocket_connections_user_id ON websocket_connections(user_id);
CREATE INDEX idx_websocket_connections_connection_id ON websocket_connections(connection_id);
CREATE INDEX idx_websocket_connections_session_id ON websocket_connections(session_id);
CREATE INDEX idx_websocket_connections_status ON websocket_connections(connection_status);

-- Daily analytics indexes
CREATE INDEX idx_daily_analytics_user_id ON daily_analytics(user_id);
CREATE INDEX idx_daily_analytics_date_bucket ON daily_analytics(date_bucket);
CREATE UNIQUE INDEX idx_daily_analytics_user_date ON daily_analytics(user_id, date_bucket);

-- Enable Row Level Security for multi-tenant isolation
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user isolation (admin can access all)
CREATE POLICY user_isolation_policy_sessions ON agent_sessions
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_credits ON credit_accounts
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_transactions ON credit_transactions
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_tokens ON auth_tokens
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_websockets ON websocket_connections
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

-- Create audit trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_tokens_updated_at BEFORE UPDATE ON auth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_accounts_updated_at BEFORE UPDATE ON credit_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_sessions_updated_at BEFORE UPDATE ON agent_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_websocket_connections_updated_at BEFORE UPDATE ON websocket_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create credit balance validation function
CREATE OR REPLACE FUNCTION validate_credit_transaction()
RETURNS TRIGGER AS $$
DECLARE
    account_unlimited BOOLEAN;
    current_balance DECIMAL(12,4);
BEGIN
    -- Get account details
    SELECT ca.unlimited_credits, ca.current_balance 
    INTO account_unlimited, current_balance
    FROM credit_accounts ca
    WHERE ca.id = NEW.account_id;
    
    -- Skip validation for admin accounts with unlimited credits
    IF account_unlimited = true OR NEW.is_admin_bypass = true THEN
        RETURN NEW;
    END IF;
    
    -- Validate sufficient balance for usage transactions
    IF NEW.transaction_type = 'usage' AND NEW.amount < 0 THEN
        IF current_balance + NEW.amount < 0 THEN
            RAISE EXCEPTION 'Insufficient credit balance. Current: %, Required: %', 
                current_balance, ABS(NEW.amount);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply credit validation trigger
CREATE TRIGGER validate_credit_transaction_trigger
    BEFORE INSERT ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION validate_credit_transaction();

-- Create function to update credit account balance
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the credit account balance
    UPDATE credit_accounts 
    SET current_balance = NEW.balance_after,
        lifetime_spent = CASE 
            WHEN NEW.transaction_type = 'usage' AND NEW.amount < 0 
            THEN lifetime_spent + ABS(NEW.amount) 
            ELSE lifetime_spent 
        END,
        lifetime_purchased = CASE 
            WHEN NEW.transaction_type = 'purchase' AND NEW.amount > 0 
            THEN lifetime_purchased + NEW.amount 
            ELSE lifetime_purchased 
        END,
        updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply credit balance update trigger
CREATE TRIGGER update_credit_balance_trigger
    AFTER INSERT ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION update_credit_balance();

-- Grant permissions to application_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO application_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO application_user;

-- Comments for table documentation
COMMENT ON TABLE users IS 'Core user management with admin privilege support and multi-factor authentication';
COMMENT ON TABLE auth_tokens IS 'Authentication token management with scoped permissions and rate limiting';
COMMENT ON TABLE credit_accounts IS 'Credit balance management with admin unlimited credits and spending controls';
COMMENT ON TABLE credit_transactions IS 'Immutable audit trail of all credit operations with 5x markup tracking';
COMMENT ON TABLE agent_sessions IS 'Agent execution tracking with recursive spawning and git branch management';
COMMENT ON TABLE websocket_connections IS 'Real-time WebSocket connection management for streaming updates';
COMMENT ON TABLE daily_analytics IS 'Daily aggregated metrics for admin dashboard analytics and reporting';

COMMENT ON COLUMN credit_transactions.claude_cost_usd IS 'Actual cost from Claude API before 5x markup';
COMMENT ON COLUMN credit_transactions.markup_multiplier IS 'Multiplier applied to Claude cost (default 5x)';
COMMENT ON COLUMN credit_transactions.is_admin_bypass IS 'True if this transaction was bypassed for admin user';
COMMENT ON COLUMN credit_accounts.unlimited_credits IS 'Admin accounts have unlimited credits without deductions';
COMMENT ON COLUMN users.admin_privileges IS 'JSON object containing admin-specific privileges and permissions';
```

## Schema: 002_audit_logs.sql

```sql
-- Phase 2 API Gateway - Audit Logging Table
-- Comprehensive security and compliance audit logging

-- Audit Logs Table for API Gateway
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event classification
    event_type VARCHAR(50) NOT NULL, 
    
    -- Context and references
    user_id UUID,
    agent_session_id UUID,
    request_id VARCHAR(100),
    
    -- Event timing
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Client information
    ip_address INET,
    user_agent TEXT,
    
    -- Event data (flexible JSON storage)
    event_data JSONB NOT NULL DEFAULT '{}',
    
    -- Risk assessment
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
    
    -- Admin activity tracking
    is_admin_action BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Retention and compliance
    retention_date DATE DEFAULT (CURRENT_DATE + INTERVAL '2 years'),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit timestamp
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agent_session_id ON audit_logs(agent_session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_admin_action ON audit_logs(is_admin_action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_timestamp ON audit_logs(event_type, timestamp DESC);

-- GIN index for searching within event_data JSON
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_data_gin ON audit_logs USING GIN(event_data);

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for API Gateway security and compliance';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event: api_request, authentication, admin_action, security_event, etc.';
COMMENT ON COLUMN audit_logs.event_data IS 'Flexible JSON storage for event-specific data and metadata';
COMMENT ON COLUMN audit_logs.risk_level IS 'Risk assessment: low, medium, high, critical for security monitoring';
COMMENT ON COLUMN audit_logs.is_admin_action IS 'Flag indicating this event was performed by an admin user';
COMMENT ON COLUMN audit_logs.retention_date IS 'Date after which this log can be archived (default 2 years)';
```

## Schema: 003_cost_tracking.sql

```sql
-- Migration: Add comprehensive cost tracking to agent_sessions table
-- This migration adds detailed API cost tracking columns to support real-time cost monitoring

-- Add cost tracking columns to agent_sessions table
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS api_calls_data JSONB DEFAULT '[]';
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}';
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_api_cost DECIMAL(12,6) DEFAULT 0.000000;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_api_calls INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_input_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_output_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS total_thinking_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS extended_pricing_calls INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS average_cost_per_call DECIMAL(10,6) DEFAULT 0.000000;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_by_phase JSONB DEFAULT '{}';

-- Create indexes for cost-related queries
CREATE INDEX IF NOT EXISTS idx_agent_sessions_total_api_cost ON agent_sessions(total_api_cost);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_total_api_calls ON agent_sessions(total_api_calls);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_cost_breakdown ON agent_sessions USING GIN (cost_breakdown);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_api_calls_data ON agent_sessions USING GIN (api_calls_data);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_cost_by_phase ON agent_sessions USING GIN (cost_by_phase);

-- Create composite index for cost analysis queries
CREATE INDEX IF NOT EXISTS idx_agent_sessions_cost_analysis ON agent_sessions(user_id, total_api_cost, total_api_calls, execution_status);

-- Add cost tracking to session messages (for detailed per-message cost tracking)
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS api_cost DECIMAL(10,6) DEFAULT 0.000000;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS thinking_tokens INTEGER DEFAULT 0;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS is_extended_pricing BOOLEAN DEFAULT FALSE;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS api_call_duration INTEGER DEFAULT 0; -- milliseconds

-- Create indexes for message-level cost queries
CREATE INDEX IF NOT EXISTS idx_session_messages_api_cost ON session_messages(api_cost);
CREATE INDEX IF NOT EXISTS idx_session_messages_tokens ON session_messages(input_tokens, output_tokens, thinking_tokens);

-- Create function to automatically calculate cost breakdown when session is updated
CREATE OR REPLACE FUNCTION update_session_cost_breakdown()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate average cost per call
    IF NEW.total_api_calls > 0 THEN
        NEW.average_cost_per_call = NEW.total_api_cost / NEW.total_api_calls;
    ELSE
        NEW.average_cost_per_call = 0;
    END IF;
    
    -- Update cost breakdown JSON with calculated values
    NEW.cost_breakdown = jsonb_build_object(
        'totalCost', NEW.total_api_cost,
        'totalCalls', NEW.total_api_calls,
        'totalTokens', (NEW.total_input_tokens + NEW.total_output_tokens + NEW.total_thinking_tokens),
        'averageCostPerCall', NEW.average_cost_per_call,
        'inputTokens', NEW.total_input_tokens,
        'outputTokens', NEW.total_output_tokens,
        'thinkingTokens', NEW.total_thinking_tokens,
        'extendedPricingCalls', NEW.extended_pricing_calls,
        'lastUpdated', NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update cost breakdown
DROP TRIGGER IF EXISTS update_session_cost_breakdown_trigger ON agent_sessions;
CREATE TRIGGER update_session_cost_breakdown_trigger
    BEFORE UPDATE ON agent_sessions
    FOR EACH ROW 
    WHEN (OLD.total_api_cost IS DISTINCT FROM NEW.total_api_cost OR 
          OLD.total_api_calls IS DISTINCT FROM NEW.total_api_calls)
    EXECUTE FUNCTION update_session_cost_breakdown();

-- Create function to get session cost summary
CREATE OR REPLACE FUNCTION get_session_cost_summary(session_uuid UUID)
RETURNS TABLE (
    session_id VARCHAR,
    total_cost DECIMAL(12,6),
    total_calls INTEGER,
    total_tokens BIGINT,
    average_cost_per_call DECIMAL(10,6),
    cost_breakdown JSONB,
    cost_by_phase JSONB,
    extended_pricing_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id,
        s.total_api_cost,
        s.total_api_calls,
        (s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens)::BIGINT,
        s.average_cost_per_call,
        s.cost_breakdown,
        s.cost_by_phase,
        CASE 
            WHEN s.total_api_calls > 0 THEN (s.extended_pricing_calls::DECIMAL / s.total_api_calls) * 100
            ELSE 0
        END
    FROM agent_sessions s
    WHERE s.id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user cost analytics
CREATE OR REPLACE FUNCTION get_user_cost_analytics(
    user_uuid UUID,
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    total_cost DECIMAL(12,6),
    total_sessions INTEGER,
    total_api_calls INTEGER,
    total_tokens BIGINT,
    average_cost_per_session DECIMAL(10,6),
    most_expensive_session DECIMAL(12,6),
    cost_trend_data JSONB
) AS $$
DECLARE
    date_filter_start TIMESTAMP;
    date_filter_end TIMESTAMP;
BEGIN
    -- Set default date range if not provided (last 30 days)
    date_filter_start := COALESCE(start_date, NOW() - INTERVAL '30 days');
    date_filter_end := COALESCE(end_date, NOW());
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(s.total_api_cost), 0)::DECIMAL(12,6) as total_cost,
        COUNT(*)::INTEGER as total_sessions,
        COALESCE(SUM(s.total_api_calls), 0)::INTEGER as total_api_calls,
        COALESCE(SUM(s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens), 0)::BIGINT as total_tokens,
        CASE 
            WHEN COUNT(*) > 0 THEN (COALESCE(SUM(s.total_api_cost), 0) / COUNT(*))::DECIMAL(10,6)
            ELSE 0::DECIMAL(10,6)
        END as average_cost_per_session,
        COALESCE(MAX(s.total_api_cost), 0)::DECIMAL(12,6) as most_expensive_session,
        jsonb_build_object(
            'dailyCosts', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'date', date_trunc('day', s2.created_at)::DATE,
                        'cost', COALESCE(SUM(s2.total_api_cost), 0),
                        'sessions', COUNT(*)
                    ) ORDER BY date_trunc('day', s2.created_at)
                )
                FROM agent_sessions s2 
                WHERE s2.user_id = user_uuid 
                AND s2.created_at BETWEEN date_filter_start AND date_filter_end
                GROUP BY date_trunc('day', s2.created_at)
            ),
            'phaseDistribution', (
                SELECT jsonb_object_agg(phase_data.phase, phase_data.cost)
                FROM (
                    SELECT 
                        s3.current_phase as phase,
                        COALESCE(SUM(s3.total_api_cost), 0) as cost
                    FROM agent_sessions s3
                    WHERE s3.user_id = user_uuid 
                    AND s3.created_at BETWEEN date_filter_start AND date_filter_end
                    GROUP BY s3.current_phase
                ) phase_data
            )
        ) as cost_trend_data
    FROM agent_sessions s
    WHERE s.user_id = user_uuid 
    AND s.created_at BETWEEN date_filter_start AND date_filter_end;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for cost analytics (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS session_cost_analytics AS
SELECT 
    DATE(s.created_at) as date,
    s.user_id,
    COUNT(*) as sessions_count,
    SUM(s.total_api_cost) as total_cost,
    AVG(s.total_api_cost) as avg_cost_per_session,
    SUM(s.total_api_calls) as total_api_calls,
    SUM(s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens) as total_tokens,
    SUM(s.extended_pricing_calls) as extended_pricing_calls,
    s.current_phase,
    COUNT(*) FILTER (WHERE s.execution_status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE s.execution_status = 'failed') as failed_sessions
FROM agent_sessions s
WHERE s.total_api_cost > 0
GROUP BY DATE(s.created_at), s.user_id, s.current_phase;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_cost_analytics_unique 
ON session_cost_analytics (date, user_id, current_phase);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_session_cost_analytics_date_user 
ON session_cost_analytics (date, user_id);

-- Function to refresh cost analytics (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_cost_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY session_cost_analytics;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN agent_sessions.api_calls_data IS 'JSON array of individual API call records with detailed cost and token information';
COMMENT ON COLUMN agent_sessions.cost_breakdown IS 'JSON object containing comprehensive cost analysis and breakdown';
COMMENT ON COLUMN agent_sessions.total_api_cost IS 'Total cost in USD for all API calls in this session (6 decimal precision)';
COMMENT ON COLUMN agent_sessions.total_api_calls IS 'Total number of API calls made during this session';
COMMENT ON COLUMN agent_sessions.total_input_tokens IS 'Total input tokens consumed across all API calls';
COMMENT ON COLUMN agent_sessions.total_output_tokens IS 'Total output tokens generated across all API calls';
COMMENT ON COLUMN agent_sessions.total_thinking_tokens IS 'Total thinking tokens used across all API calls';
COMMENT ON COLUMN agent_sessions.extended_pricing_calls IS 'Number of API calls that used extended context pricing (>200K tokens)';
COMMENT ON COLUMN agent_sessions.average_cost_per_call IS 'Average cost per API call for this session';
COMMENT ON COLUMN agent_sessions.cost_by_phase IS 'JSON object showing cost breakdown by agent execution phase';

COMMENT ON COLUMN session_messages.api_cost IS 'Cost in USD for the API call that generated this message';
COMMENT ON COLUMN session_messages.input_tokens IS 'Number of input tokens for this specific message/API call';
COMMENT ON COLUMN session_messages.output_tokens IS 'Number of output tokens for this specific message/API call';
COMMENT ON COLUMN session_messages.thinking_tokens IS 'Number of thinking tokens for this specific message/API call';
COMMENT ON COLUMN session_messages.is_extended_pricing IS 'Whether this API call used extended context pricing';
COMMENT ON COLUMN session_messages.api_call_duration IS 'Duration of the API call in milliseconds';

COMMENT ON FUNCTION get_session_cost_summary IS 'Get comprehensive cost summary for a specific session';
COMMENT ON FUNCTION get_user_cost_analytics IS 'Get detailed cost analytics for a user within a date range';
COMMENT ON MATERIALIZED VIEW session_cost_analytics IS 'Aggregated daily cost analytics for efficient reporting and dashboards';

-- Create a view for easy cost monitoring queries
CREATE OR REPLACE VIEW session_cost_overview AS
SELECT 
    s.id,
    s.session_id,
    s.user_id,
    u.email as user_email,
    s.total_api_cost,
    s.total_api_calls,
    (s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens) as total_tokens,
    s.average_cost_per_call,
    s.extended_pricing_calls,
    CASE 
        WHEN s.total_api_calls > 0 THEN (s.extended_pricing_calls::DECIMAL / s.total_api_calls) * 100
        ELSE 0
    END as extended_pricing_percentage,
    s.execution_status,
    s.current_phase,
    s.created_at,
    s.updated_at,
    (s.updated_at - s.created_at) as session_duration,
    s.cost_breakdown,
    -- Cost efficiency metrics
    CASE 
        WHEN (s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens) > 0 
        THEN s.total_api_cost / ((s.total_input_tokens + s.total_output_tokens + s.total_thinking_tokens) / 1000000.0)
        ELSE 0
    END as cost_per_million_tokens
FROM agent_sessions s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.total_api_cost > 0
ORDER BY s.total_api_cost DESC;

COMMENT ON VIEW session_cost_overview IS 'Comprehensive view for cost monitoring and analysis with user information and efficiency metrics';
```

## Schema: 004_phase33_recursive_agents.sql

```sql
-- keen Platform Database Schema - Phase 3.3 Recursive Agent Enhancements
-- Adds specialized tables and columns for recursive agent spawning, specialization, and sequential execution
-- Includes git operations tracking, phase transitions, and tool executions

-- Add Phase 3.3 columns to agent_sessions table
ALTER TABLE agent_sessions 
ADD COLUMN IF NOT EXISTS specialization VARCHAR(20) NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS max_recursion_depth INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS execution_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spawn_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS merge_timestamp TIMESTAMP WITH TIME ZONE;

-- Add constraint for specialization values
ALTER TABLE agent_sessions 
ADD CONSTRAINT check_specialization 
CHECK (specialization IN ('frontend', 'backend', 'database', 'testing', 'security', 'devops', 'general'));

-- Update current_phase to include new Phase 3.3 phases
ALTER TABLE agent_sessions 
DROP CONSTRAINT IF EXISTS check_current_phase;

ALTER TABLE agent_sessions 
ADD CONSTRAINT check_current_phase 
CHECK (current_phase IN ('EXPLORE', 'PLAN', 'FOUND', 'SUMMON', 'COMPLETE'));

-- Phase Transitions Table (Enhanced for Phase 3.3)
CREATE TABLE IF NOT EXISTS phase_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transition details
    from_phase VARCHAR(20) NOT NULL,
    to_phase VARCHAR(20) NOT NULL,
    transition_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_ms INTEGER, -- Duration spent in from_phase
    
    -- Phase report data
    summary TEXT NOT NULL,
    key_findings TEXT[] DEFAULT '{}',
    next_actions TEXT[] DEFAULT '{}',
    confidence DECIMAL(3,2), -- 0.00 to 1.00
    estimated_time_remaining VARCHAR(255),
    
    -- Phase 3.3 specific fields
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    parent_session_id UUID REFERENCES agent_sessions(id),
    
    -- Context and metadata
    phase_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tool Executions Table (Enhanced for Phase 3.3)
CREATE TABLE IF NOT EXISTS tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tool execution details
    tool_name VARCHAR(100) NOT NULL,
    tool_parameters JSONB NOT NULL DEFAULT '{}',
    execution_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Results and performance
    execution_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    result_data JSONB,
    error_message TEXT,
    
    -- Resource usage
    tokens_consumed INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0.000000,
    
    -- Phase 3.3 specific fields
    phase VARCHAR(20),
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    is_recursive_spawn BOOLEAN DEFAULT false, -- True for summon_agent calls
    child_session_id UUID REFERENCES agent_sessions(id), -- If this spawned a child
    
    -- Context and metadata
    execution_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Git Operations Table (Enhanced for Phase 3.3)
CREATE TABLE IF NOT EXISTS git_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Git operation details
    operation_type VARCHAR(20) NOT NULL, -- commit, branch, merge, push, pull, clone, checkout
    branch_name VARCHAR(255) NOT NULL,
    commit_hash VARCHAR(64),
    operation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Operation metadata
    commit_message TEXT,
    files_changed TEXT[] DEFAULT '{}',
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    merge_conflicts JSONB, -- Details of any merge conflicts
    
    -- Phase 3.3 specific fields
    specialization VARCHAR(20),
    tree_depth INTEGER DEFAULT 0,
    parent_branch VARCHAR(255), -- Parent branch for child agents
    is_sequential_merge BOOLEAN DEFAULT false, -- True for Phase 3.3 sequential merges
    child_session_id UUID REFERENCES agent_sessions(id), -- If this was a child merge
    
    -- Results and status
    success BOOLEAN NOT NULL,
    error_message TEXT,
    operation_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent Tree Relationships Table (Phase 3.3)
CREATE TABLE IF NOT EXISTS agent_tree_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    parent_session_id UUID REFERENCES agent_sessions(id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tree structure
    tree_depth INTEGER NOT NULL DEFAULT 0,
    execution_order INTEGER NOT NULL DEFAULT 0,
    specialization VARCHAR(20) NOT NULL DEFAULT 'general',
    git_branch VARCHAR(255) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
    phase VARCHAR(20) NOT NULL DEFAULT 'EXPLORE',
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    spawn_duration_ms INTEGER, -- Time taken to spawn (for children)
    execution_duration_ms INTEGER, -- Total execution time
    
    -- Results
    completion_result JSONB,
    files_created INTEGER DEFAULT 0,
    files_modified INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0.000000,
    
    -- Child tracking
    child_sessions UUID[] DEFAULT '{}', -- Array of child session IDs
    active_children INTEGER DEFAULT 0,
    completed_children INTEGER DEFAULT 0,
    
    -- Metadata
    spawn_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent Coordination Events Table (Phase 3.3)
CREATE TABLE IF NOT EXISTS agent_coordination_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- spawn_child, child_completed, phase_sync, dependency_check
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Coordination context
    parent_session_id UUID REFERENCES agent_sessions(id),
    child_session_id UUID REFERENCES agent_sessions(id),
    target_specialization VARCHAR(20),
    coordination_action VARCHAR(50), -- summon_agent, coordinate_agents, get_agent_status
    
    -- Event data
    event_data JSONB NOT NULL DEFAULT '{}',
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Sequential execution tracking
    execution_sequence INTEGER,
    tree_depth INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Update daily_analytics to include Phase 3.3 metrics
ALTER TABLE daily_analytics 
ADD COLUMN IF NOT EXISTS recursive_spawns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_tree_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sequential_merges INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS specialization_distribution JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS phase_transition_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS git_operations_count INTEGER DEFAULT 0;

-- Create indexes for Phase 3.3 tables

-- Phase transitions indexes
CREATE INDEX idx_phase_transitions_session_id ON phase_transitions(session_id);
CREATE INDEX idx_phase_transitions_user_id ON phase_transitions(user_id);
CREATE INDEX idx_phase_transitions_timestamp ON phase_transitions(transition_timestamp);
CREATE INDEX idx_phase_transitions_from_to ON phase_transitions(from_phase, to_phase);
CREATE INDEX idx_phase_transitions_specialization ON phase_transitions(specialization);
CREATE INDEX idx_phase_transitions_parent ON phase_transitions(parent_session_id);

-- Tool executions indexes
CREATE INDEX idx_tool_executions_session_id ON tool_executions(session_id);
CREATE INDEX idx_tool_executions_user_id ON tool_executions(user_id);
CREATE INDEX idx_tool_executions_tool_name ON tool_executions(tool_name);
CREATE INDEX idx_tool_executions_timestamp ON tool_executions(execution_timestamp);
CREATE INDEX idx_tool_executions_success ON tool_executions(success);
CREATE INDEX idx_tool_executions_specialization ON tool_executions(specialization);
CREATE INDEX idx_tool_executions_recursive ON tool_executions(is_recursive_spawn);
CREATE INDEX idx_tool_executions_child ON tool_executions(child_session_id);

-- Git operations indexes
CREATE INDEX idx_git_operations_session_id ON git_operations(session_id);
CREATE INDEX idx_git_operations_user_id ON git_operations(user_id);
CREATE INDEX idx_git_operations_branch_name ON git_operations(branch_name);
CREATE INDEX idx_git_operations_operation_type ON git_operations(operation_type);
CREATE INDEX idx_git_operations_timestamp ON git_operations(operation_timestamp);
CREATE INDEX idx_git_operations_specialization ON git_operations(specialization);
CREATE INDEX idx_git_operations_sequential ON git_operations(is_sequential_merge);
CREATE INDEX idx_git_operations_parent_branch ON git_operations(parent_branch);

-- Agent tree nodes indexes
CREATE INDEX idx_agent_tree_nodes_session_id ON agent_tree_nodes(session_id);
CREATE INDEX idx_agent_tree_nodes_parent ON agent_tree_nodes(parent_session_id);
CREATE INDEX idx_agent_tree_nodes_user_id ON agent_tree_nodes(user_id);
CREATE INDEX idx_agent_tree_nodes_depth ON agent_tree_nodes(tree_depth);
CREATE INDEX idx_agent_tree_nodes_order ON agent_tree_nodes(execution_order);
CREATE INDEX idx_agent_tree_nodes_status ON agent_tree_nodes(status);
CREATE INDEX idx_agent_tree_nodes_specialization ON agent_tree_nodes(specialization);
CREATE INDEX idx_agent_tree_nodes_branch ON agent_tree_nodes(git_branch);

-- Agent coordination events indexes
CREATE INDEX idx_coordination_events_session_id ON agent_coordination_events(session_id);
CREATE INDEX idx_coordination_events_user_id ON agent_coordination_events(user_id);
CREATE INDEX idx_coordination_events_type ON agent_coordination_events(event_type);
CREATE INDEX idx_coordination_events_timestamp ON agent_coordination_events(event_timestamp);
CREATE INDEX idx_coordination_events_parent ON agent_coordination_events(parent_session_id);
CREATE INDEX idx_coordination_events_child ON agent_coordination_events(child_session_id);
CREATE INDEX idx_coordination_events_specialization ON agent_coordination_events(target_specialization);
CREATE INDEX idx_coordination_events_sequence ON agent_coordination_events(execution_sequence);

-- Enhanced agent_sessions indexes for Phase 3.3
CREATE INDEX idx_agent_sessions_specialization ON agent_sessions(specialization);
CREATE INDEX idx_agent_sessions_execution_order ON agent_sessions(execution_order);
CREATE INDEX idx_agent_sessions_spawn_timestamp ON agent_sessions(spawn_timestamp);

-- Enable Row Level Security for new Phase 3.3 tables
ALTER TABLE phase_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_coordination_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Phase 3.3 tables
CREATE POLICY user_isolation_policy_phase_transitions ON phase_transitions
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_tool_executions ON tool_executions
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_git_operations ON git_operations
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_agent_tree_nodes ON agent_tree_nodes
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

CREATE POLICY user_isolation_policy_coordination_events ON agent_coordination_events
    FOR ALL TO application_user
    USING (
        user_id = COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID) OR 
        COALESCE(current_setting('app.is_admin_user', true)::BOOLEAN, false) = true
    );

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_agent_tree_nodes_updated_at BEFORE UPDATE ON agent_tree_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate sequential execution constraints
CREATE OR REPLACE FUNCTION validate_sequential_execution()
RETURNS TRIGGER AS $$
DECLARE
    active_siblings INTEGER;
BEGIN
    -- For new agent spawns, check if parent already has active children
    IF TG_OP = 'INSERT' AND NEW.parent_session_id IS NOT NULL THEN
        SELECT COUNT(*) INTO active_siblings
        FROM agent_tree_nodes
        WHERE parent_session_id = NEW.parent_session_id
          AND status = 'running'
          AND id != NEW.id;
        
        IF active_siblings > 0 THEN
            RAISE EXCEPTION 'Sequential execution violation: Parent % already has % active children. Sequential mode allows only one active child at a time.', 
                NEW.parent_session_id, active_siblings;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply sequential execution validation trigger
CREATE TRIGGER validate_sequential_execution_trigger
    BEFORE INSERT OR UPDATE ON agent_tree_nodes
    FOR EACH ROW EXECUTE FUNCTION validate_sequential_execution();

-- Create function to update parent's child count
CREATE OR REPLACE FUNCTION update_parent_child_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update parent's child counts when child status changes
    IF NEW.parent_session_id IS NOT NULL THEN
        UPDATE agent_tree_nodes
        SET 
            active_children = (
                SELECT COUNT(*) FROM agent_tree_nodes 
                WHERE parent_session_id = NEW.parent_session_id AND status = 'running'
            ),
            completed_children = (
                SELECT COUNT(*) FROM agent_tree_nodes 
                WHERE parent_session_id = NEW.parent_session_id AND status = 'completed'
            ),
            updated_at = NOW()
        WHERE session_id = NEW.parent_session_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply parent child count update trigger
CREATE TRIGGER update_parent_child_count_trigger
    AFTER INSERT OR UPDATE OF status ON agent_tree_nodes
    FOR EACH ROW EXECUTE FUNCTION update_parent_child_count();

-- Create materialized view for agent tree analytics
CREATE MATERIALIZED VIEW agent_tree_analytics AS
SELECT 
    DATE_TRUNC('hour', atn.created_at) as hour_bucket,
    atn.user_id,
    COUNT(*) as total_agents,
    COUNT(*) FILTER (WHERE atn.status = 'completed') as completed_agents,
    COUNT(*) FILTER (WHERE atn.status = 'failed') as failed_agents,
    MAX(atn.tree_depth) as max_depth,
    AVG(atn.execution_duration_ms) as avg_execution_time,
    SUM(atn.total_cost) as total_cost,
    COUNT(DISTINCT atn.specialization) as unique_specializations,
    jsonb_object_agg(atn.specialization, COUNT(*)) as specialization_counts
FROM agent_tree_nodes atn
WHERE atn.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', atn.created_at), atn.user_id
ORDER BY hour_bucket DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_agent_tree_analytics_unique ON agent_tree_analytics(hour_bucket, user_id);

-- Grant permissions to application_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO application_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO application_user;
GRANT SELECT ON agent_tree_analytics TO application_user;

-- Comments for new Phase 3.3 tables
COMMENT ON TABLE phase_transitions IS 'Phase 3.3: Tracks agent phase transitions with specialization and tree context';
COMMENT ON TABLE tool_executions IS 'Phase 3.3: Detailed tool execution tracking with recursive spawn detection';
COMMENT ON TABLE git_operations IS 'Phase 3.3: Git operations tracking with sequential merge support';
COMMENT ON TABLE agent_tree_nodes IS 'Phase 3.3: Agent tree structure and hierarchy management';
COMMENT ON TABLE agent_coordination_events IS 'Phase 3.3: Events related to agent coordination and sequential execution';

COMMENT ON COLUMN agent_sessions.specialization IS 'Phase 3.3: Agent specialization (frontend, backend, database, testing, security, devops, general)';
COMMENT ON COLUMN agent_sessions.max_recursion_depth IS 'Phase 3.3: Maximum allowed recursion depth for this agent tree';
COMMENT ON COLUMN agent_sessions.execution_order IS 'Phase 3.3: Sequential execution order within the tree';
COMMENT ON COLUMN tool_executions.is_recursive_spawn IS 'Phase 3.3: True if this tool execution spawned a child agent';
COMMENT ON COLUMN git_operations.is_sequential_merge IS 'Phase 3.3: True if this was a sequential merge from child to parent';
COMMENT ON COLUMN agent_tree_nodes.execution_order IS 'Phase 3.3: Order of execution in sequential mode (depth-first)';

-- Create refresh function for materialized view (to be called by cron job)
CREATE OR REPLACE FUNCTION refresh_agent_tree_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY agent_tree_analytics;
END;
$$ LANGUAGE plpgsql;

```

### Configuration
**File: src/config/index.ts**

```typescript
// === IMPORTS ===
export {

// === KEY DEFINITIONS ===
export interface KeenSAConfig {
export type KeenPlatformConfig = KeenSAConfig;
export const getKeenPlatformConfig = getKeenSAConfig;
export const databaseConfig = supabaseConfig;
export const config = supabaseConfig;
export const testConfig = supabaseConfig; // For tests, use same config
export interface DatabaseConfig {

// === METHOD SIGNATURES ===
```

### Agent Types
**File: src/agent/types.ts**

```typescript
// === IMPORTS ===
import { AnthropicConfig } from '../config/AnthropicConfig.js';
import { UserContext } from '../database/DatabaseManager.js';
export type AgentPhase = 'EXPLORE' | 'PLAN' | 'FOUND' | 'SUMMON' | 'COMPLETE';
export type AgentSpecialization = 

// === KEY DEFINITIONS ===
export type AgentPhase = 'EXPLORE' | 'PLAN' | 'FOUND' | 'SUMMON' | 'COMPLETE';
export type AgentSpecialization = 
export interface AgentSpawnRequest {
export interface AgentSpawnResult {
export interface AgentTreeNode {
export interface AgentTreeStatus {
export interface AgentExecutionContext {
export interface ToolManagerOptions {
export interface AgentSessionOptions {
export interface ToolSchema {
export interface ToolResult {
export interface ThinkingBlock {
export interface PhaseTransition {
export interface AgentMetrics {
export interface AgentError {

// === METHOD SIGNATURES ===
  nextChildBranch(parentBranch: string, existingChildren: string[] = []): string {
    while (usedLetters.includes(nextLetter)) {
  isValidChildBranch(branchName: string): boolean {
  getParentBranch(childBranch: string): string {
    if (childBranch === 'main') return '';
    if (childBranch.startsWith('summon-') && childBranch.split('-').length === 2) {
  getBranchDepth(branchName: string): number {
    if (branchName === 'main') return 0;
    return (branchName.match(/summon/g) || []).length;
```

### API Types
**File: src/api/types.ts**

```typescript
// === IMPORTS ===
import { Request } from 'express';
export interface AuthenticatedRequest extends Request {

// === KEY DEFINITIONS ===
export interface AuthenticatedRequest extends Request {
export interface AuthenticatedUser {
export interface JWTPayload {
export interface LoginCredentials {
export interface ClientInfo {
export interface AuthenticationResult {
export interface APIKeyConfig {
export interface APIKeyResult {
export interface APIKeyValidation {
export interface RateLimitInfo {
export interface ConcurrencyCheckResult {
export interface RateLimits {
export interface CreditReservation {
export interface InsufficientCreditsError extends Error {
export interface AgentExecutionRequest {

// === METHOD SIGNATURES ===
  constructor(message: string) {
    super(message);
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
  constructor(message: string, public rateLimitInfo: RateLimitInfo) {
    super(message);
  constructor(message: string, public concurrencyInfo: ConcurrencyCheckResult) {
    super(message);
  constructor(message: string) {
    super(message);
```


## Technical Metrics

### Code Statistics
```
Total TypeScript files: 81
Total JavaScript files: 0
Total lines of code:   33300 total
Total directories: 24
```

### Dependencies Analysis
```json
{
  "@anthropic-ai/sdk": "^0.60.0",
  "@supabase/supabase-js": "^2.38.0",
  "bcrypt": "^5.1.1",
  "chalk": "^5.3.0",
  "commander": "^11.1.0",
  "compression": "^1.8.1",
  "cors": "^2.8.5",
  "decimal.js": "^10.4.3",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "express-rate-limit": "^7.5.1",
  "express-slow-down": "^1.6.0",
  "express-validator": "^7.2.1",
  "helmet": "^7.2.0",
  "jsonwebtoken": "^9.0.2",
  "morgan": "^1.10.1",
  "multer": "^1.4.5-lts.1",
  "node-cron": "^3.0.3",
  "uuid": "^9.0.1",
  "ws": "^8.14.2"
}
```

**Key Dependencies Identified:**
- @anthropic-ai/sdk

## Investment Analysis Framework

### Key Questions for Evaluation:
1. **Market Positioning**: How does this compare to existing AI agent frameworks?
2. **Technical Differentiation**: What unique capabilities does the agent orchestration provide?
3. **Scalability**: How well does the architecture support growth?
4. **Monetization**: What does the credit system reveal about business model?
5. **Competition**: How does this stack against LangChain, CrewAI, AutoGPT, etc?

### Architecture Highlights:
- Multi-agent coordination system
- Quality gates and validation pipeline
- Credit-based usage model
- WebSocket real-time communication
- CLI and API interfaces
- Database persistence with Supabase

---
*Analysis completed. Review the extracted code and schemas above for detailed technical evaluation.*
