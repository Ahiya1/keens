# keen - Autonomous Development Platform

**keen** is a production-grade autonomous development platform powered by Claude AI that executes complex software development tasks through recursive agent spawning, comprehensive validation, and intelligent phase-driven workflows.

[![Test Coverage](https://img.shields.io/badge/coverage-80%2B-brightgreen)]()
[![Tests Passing](https://img.shields.io/badge/tests-46%2F46-success)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)]()
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)]()

## 🚀 What is keen?

keen transforms natural language visions into complete, production-ready software through an autonomous agent system that:

- **Executes recursively** - Spawns child agents to parallelize complex development tasks
- **Validates continuously** - Runs compilation, tests, and quality checks at every step
- **Works with git** - Creates isolated branches for each agent with intelligent merging
- **Streams in real-time** - WebSocket updates for live progress monitoring
- **Scales intelligently** - Multi-tenant architecture with credit-based resource management

### Key Features

✅ **1M Context Window** - All agents utilize Claude's full 1,000,000 token context
✅ **Recursive Agent Spawning** - Hierarchical task decomposition with git branch isolation
✅ **4-Phase Execution** - EXPLORE → PLAN → SUMMON → COMPLETE lifecycle
✅ **Multi-Tenant** - Complete user isolation with PostgreSQL/Supabase RLS
✅ **Real-time Streaming** - WebSocket progress updates and agent tree visualization
✅ **Credit System** - Usage-based billing with 5x markup over Claude API costs
✅ **Production Ready** - Comprehensive tests, security, and deployment automation

## 🏗️ Architecture

keen is built with three main layers:

```
┌─────────────────────────────────────────────────┐
│              API Gateway Layer                  │
│  • Authentication (JWT + API Keys)              │
│  • Credit Management (5x markup)                │
│  • Rate Limiting & Abuse Prevention             │
│  • WebSocket Streaming                          │
│  • Multi-tenant Isolation                       │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│              Agent Core Layer                   │
│  • Pure agent execution (no billing awareness)  │
│  • 1M context window with thinking blocks       │
│  • Recursive git-based spawning                 │
│  • 4-phase lifecycle management                 │
│  • Tool ecosystem integration                   │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│            Database Layer (Supabase)            │
│  • PostgreSQL with Row-Level Security           │
│  • Users, Sessions, Credits, Analytics          │
│  • Real-time subscriptions                      │
│  • Multi-tenant data isolation                  │
└─────────────────────────────────────────────────┘
```

### Agent Execution Flow

```
User Request → API Gateway → Workspace Provisioning → Agent Spawn
     │              │                │                      │
     │              ├─ Auth Check    └─ Git Init           │
     │              ├─ Credit Check                        │
     │              └─ Rate Limit                          │
     │                                                      │
     └──────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  EXPLORE Phase     │
                    │  - Analyze project │
                    │  - Understand tech │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  PLAN Phase        │
                    │  - Design solution │
                    │  - Break down work │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  SUMMON Phase      │
                    │  - Spawn agents    │
                    │  - Parallel work   │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  COMPLETE Phase    │
                    │  - Integration     │
                    │  - Validation      │
                    │  - Documentation   │
                    └────────────────────┘
```

### Recursive Agent Tree

```
Main Agent (branch: main)
│
├── SUMMON Phase Triggered
│   │
│   ├── Branch: summon-auth
│   │   └── Agent: Authentication System
│   │       ├── EXPLORE → PLAN → SUMMON
│   │       │   ├── Branch: summon-auth-jwt
│   │       │   │   └── Agent: JWT Implementation
│   │       │   └── Branch: summon-auth-api-keys
│   │       │       └── Agent: API Keys Implementation
│   │       └── COMPLETE → Merge to summon-auth
│   │
│   ├── Branch: summon-database
│   │   └── Agent: Database Layer
│   │
│   └── Wait for all branches → Merge all to main
│
└── COMPLETE Phase → Final validation & report
```

## 📦 Installation

### Prerequisites

- **Node.js 18+**
- **Supabase Account** (or PostgreSQL 14+)
- **Anthropic API Key** ([Get one here](https://console.anthropic.com/))
- **Git** (for agent workspace management)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/keens.git
cd keens

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your credentials
# - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# - ANTHROPIC_API_KEY
# - JWT_SECRET
```

### Database Setup

#### Option 1: Supabase (Recommended)

```bash
# 1. Create project at supabase.com
# 2. Add credentials to .env
# 3. Run migrations
npm run db:migrate
```

#### Option 2: Local PostgreSQL

```bash
# Create database
createdb keen_development

# Update .env with local PostgreSQL credentials
DB_HOST=localhost
DB_NAME=keen_development
DB_USER=keen_user
DB_PASSWORD=your_password

# Run migrations
npm run db:migrate
```

### Build and Run

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Start development server
npm run dev

# Or start production server
npm start
```

The API server will be available at `http://localhost:3000`

## 🔧 Usage

### CLI Usage

```bash
# Build and test CLI
npm run dev:cli

# Login
./bin/keen.js login

# Execute autonomous task
./bin/keen.js breathe "Create a React TypeScript todo app with tests"

# Check status
./bin/keen.js status

# Get version
./bin/keen.js version
```

### API Usage

#### Authentication

```bash
# Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SecurePass123!",
    "username": "developer"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SecurePass123!"
  }'
```

#### Execute Agent

```bash
# Start autonomous development session
curl -X POST http://localhost:3000/api/v1/agents/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vision": "Create a REST API with authentication and user management",
    "workingDirectory": "/tmp/my-project",
    "options": {
      "enableStreaming": true,
      "maxIterations": 50
    }
  }'

# Response includes session_id and streaming WebSocket URL
```

#### Monitor Session

```bash
# Get session status
curl -X GET http://localhost:3000/api/v1/agents/sessions/SESSION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Cancel session
curl -X POST http://localhost:3000/api/v1/agents/sessions/SESSION_ID/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Credit Management

```bash
# Check balance
curl -X GET http://localhost:3000/api/v1/credits/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Purchase credits
curl -X POST http://localhost:3000/api/v1/credits/purchase \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "paymentMethodId": "pm_stripe_id"
  }'

# Get transaction history
curl -X GET http://localhost:3000/api/v1/credits/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/TypeScript SDK

```typescript
import { KeenClient } from '@keen/sdk';

const keen = new KeenClient({
  apiKey: 'your-api-key' // or use accessToken for JWT auth
});

// Execute agent
const session = await keen.agents.execute({
  vision: 'Create a modern React dashboard with charts',
  workingDirectory: './my-dashboard',
  options: {
    enableStreaming: true,
    costBudget: 25.00
  }
});

// Listen to real-time events
session.on('phase_transition', (event) => {
  console.log(`Phase: ${event.data.from_phase} → ${event.data.to_phase}`);
  console.log(`Summary: ${event.data.summary}`);
});

session.on('agent_spawned', (event) => {
  console.log(`Spawned agent: ${event.data.purpose}`);
  console.log(`Branch: ${event.data.git_branch}`);
});

session.on('complete', (event) => {
  console.log('✅ Session completed!');
  console.log(`Files created: ${event.data.files_created}`);
  console.log(`Total cost: $${event.data.total_cost}`);
});
```

## 🧪 Testing

keen has comprehensive test coverage across all layers:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit              # Unit tests
npm run test:api               # API integration tests
npm run test:integration       # Database integration tests
npm run test:security          # Security & RLS tests
npm run test:performance       # Performance benchmarks

# Run with coverage report
npm test -- --coverage

# Watch mode for development
npm run test:watch
```

### Test Results

```
✅ All 46 test suites passing
✅ 80%+ code coverage
✅ Security tests (RLS, auth, rate limiting)
✅ Performance benchmarks (concurrent operations)
✅ Integration tests (database, API, agents)
```

## 🔐 Security

keen implements production-grade security:

### Authentication & Authorization
- **JWT Tokens** - Short-lived access tokens (15min) with refresh tokens (7 days)
- **API Keys** - Scoped API keys with configurable rate limits
- **Row-Level Security** - PostgreSQL RLS for complete tenant isolation
- **bcrypt Password Hashing** - Industry-standard password security

### Multi-Tenant Isolation
- **Workspace Isolation** - Complete filesystem separation per user
- **Database RLS** - User data completely isolated at database level
- **Process Isolation** - Containerized agent execution
- **Network Isolation** - Prevented cross-user communication

### Rate Limiting & Abuse Prevention
- **Per-User Limits** - Configurable request limits (default: 1000/hour)
- **Admin Bypass** - Admin user (ahiya.butman@gmail.com) bypasses limits
- **Concurrent Session Limits** - Prevent resource exhaustion
- **Cost Budget Enforcement** - Per-session cost limits

### Audit Logging
- **Complete Audit Trail** - All API calls, agent executions, and user actions logged
- **Credit Transaction Logging** - Detailed financial audit trail
- **Admin Activity Tracking** - Special logging for administrative actions

## 💰 Credit System

keen uses a transparent credit-based pricing model:

### Pricing Model
```
Claude API Cost → 5x Markup → keen Credits

Example:
- Claude Input (1M tokens): $6.00
- keen Credit Cost: $30.00 (6.00 × 5)
- Extended Context (>200K): Higher tier pricing
```

### Admin Privileges
- **Unlimited Credits** - Admin user has unlimited access
- **Cost Tracking** - Admin usage logged but not charged
- **Analytics Access** - Full system visibility
- **Bypass All Limits** - No rate limiting or session restrictions

### Credit Flow
```
User Purchase → Credits Added to Account
                      ↓
              Agent Execution
                      ↓
              Track Claude API Cost
                      ↓
              Apply 5x Markup
                      ↓
              Deduct from User Credits
```

## 📊 Monitoring & Analytics

Access real-time analytics:

```bash
# Dashboard metrics
curl -X GET http://localhost:3000/api/v1/analytics/dashboard?period=24h \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Usage analytics
curl -X GET http://localhost:3000/api/v1/analytics/usage?start_date=2024-01-01 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Metrics Tracked
- **Session Statistics** - Success rates, completion times, phase distributions
- **Agent Performance** - Spawning depth, tool usage, git operations
- **Cost Analytics** - Claude API costs vs credit revenue
- **Tool Usage** - Most-used tools and success rates
- **System Health** - Active users, sessions, WebSocket connections

## 🚢 Deployment

### Local Development

```bash
npm run dev        # Development server with hot reload
npm run build      # Build TypeScript
npm start          # Production server
```

### Production Deployment

#### Vercel (Landing Page)
```bash
cd client
npm run build:client
npm run deploy:vercel
```

#### Railway (Backend API)
```bash
npm run deploy:railway
```

#### Supabase (Database)
```bash
# Database migrations run automatically
npm run db:migrate
```

### Environment Variables

Required production environment variables:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key

# Security
JWT_SECRET=your-secure-secret
BCRYPT_ROUNDS=12

# Configuration
NODE_ENV=production
CREDIT_MARKUP_MULTIPLIER=5.0
ADMIN_EMAIL=ahiya.butman@gmail.com
ADMIN_PASSWORD=2con-creator
```

## 📖 Documentation

Detailed documentation available in `docs/`:

- [Architecture Guide](docs/ARCHITECTURE.md) - System architecture and design
- [API Specification](docs/API_SPECIFICATION.md) - Complete API reference
- [Database Schema](docs/DATABASE_SCHEMA.md) - Database design and tables
- [Agent Instructions](docs/AGENT_INSTRUCTIONS/) - Phase-specific agent guides
- [1M Context Configuration](docs/1M_CONTEXT_CONFIGURATION.md) - Context window setup
- [Recursive Agents](docs/RECURSIVE_AGENTS.md) - Agent spawning guide

## 🛠️ Development Workflow

### Adding New Features

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Implement feature
# - Add code to appropriate layer (API/Agent/Database)
# - Follow existing patterns

# 3. Write tests
npm run test:watch

# 4. Run validation
npm run build
npm test
npm run lint

# 5. Create PR
git push origin feature/new-feature
```

### Code Quality

```bash
# Lint TypeScript
npm run lint

# Format code
npm run format

# Run all validation
npm run validate
```

### Project Structure

```
src/
├── api/              # API Gateway Layer
│   ├── middleware/   # Auth, rate limiting, error handling
│   ├── routes/       # REST endpoints
│   ├── services/     # Business logic
│   └── websocket/    # WebSocket management
├── agent/            # Agent Core Layer
│   ├── prompts/      # Agent prompts and templates
│   ├── tools/        # Agent tools (read, write, git, etc)
│   ├── validation/   # Quality gates and validators
│   └── streaming/    # Real-time progress streaming
├── database/         # Database Layer
│   ├── dao/          # Data Access Objects
│   └── migrations/   # SQL migrations
├── cli/              # CLI commands
│   ├── commands/     # CLI command implementations
│   └── auth/         # CLI authentication
├── config/           # Configuration management
└── types/            # TypeScript type definitions
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- Built with [Claude](https://www.anthropic.com/claude) by Anthropic
- Powered by [Supabase](https://supabase.com) for database and real-time features
- Uses [PostgreSQL](https://www.postgresql.org/) for reliable data persistence

## 📞 Support

- **Documentation**: See `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/yourusername/keens/issues)
- **Email**: ahiya.butman@gmail.com

---

**Built with ❤️ by the keen team**

*Autonomous development, redefined.*
