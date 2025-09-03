# keen: Autonomous Development Platform

## What keen Is

keen transforms a2s2's autonomous agent system into a commercial platform where developers worldwide can:

- **Execute autonomous development tasks** through authenticated access with credit-based usage
- **Scale development through recursive agent spawning** - agents create sub-agents in git branches infinitely  
- **Monitor progress in real-time** through live dashboard showing agent trees and git operations
- **Resume and manage sessions** across time with persistent workspace state
- **Collaborate through shared workspaces** with complete user isolation
- **Access 1M token context** for all agents enabling sophisticated reasoning on complex codebases

## The Revolutionary Recursive Architecture

keen's breakthrough innovation is **git-based recursive agent spawning**:

```
main-agent (handles authentication system)
├── summon-A (JWT implementation)
├── summon-B (API key system)
│   ├── summon-B-A (middleware development)
│   └── summon-B-B (rate limiting)
├── summon-C (database layer)
│   ├── summon-C-A (schema design)
│   ├── summon-C-B (migrations)
│   └── summon-C-C (data access layer)
└── summon-D (frontend dashboard)
    ├── summon-D-A (authentication UI)
    ├── summon-D-B (agent monitoring)
    └── summon-D-C (credit management)
```

**How it Works:**
1. **Agent spawns sub-agents** in isolated git branches (summon-A, summon-B, etc.)
2. **Sub-agents can spawn their own sub-agents** infinitely (summon-A-A, summon-A-A-A)
3. **Parallel development** - multiple agents work simultaneously on different system parts
4. **Git-based coordination** - parent agents wait for children, then merge with validation
5. **Real-time visualization** - dashboard shows entire agent tree with branch status
6. **Automatic scaling** - system organically scales based on task complexity

## Core Differentiators

### 1. Multi-tenant Architecture
- **Complete user isolation** - each user gets dedicated workspace with no shared state
- **Scalable infrastructure** - supports thousands of concurrent users
- **Workspace management** - automatic provisioning and cleanup
- **Resource limits** - per-user quotas and rate limiting

### 2. Credit System (No Packages)
- **Pure credit-based pricing** - no subscription packages, only pay-per-use credits
- **Agents never see costs** - gateway handles all billing transparently with 5x markup
- **Usage-based pricing** - pay only for agent execution time and token usage
- **Budget management** - set limits, get alerts, prevent overruns
- **Cost optimization** - intelligent context management and caching
- **5x markup model** - keen credits cost 5 times the actual Claude API costs

### 3. Real-time Visualization
- **Live agent trees** - see recursive spawning in real-time
- **Git operations streaming** - commits, merges, branch creation visualized
- **Progress indicators** - detailed status for each agent and phase
- **Interactive exploration** - drill down into any agent's work

### 4. Production Grade
- **Full authentication** - JWT tokens, API keys, multi-factor auth
- **Comprehensive monitoring** - metrics, logs, alerts, health checks
- **Rate limiting** - prevent abuse, manage concurrent sessions
- **Audit logging** - complete trail of all operations for security

### 5. 1M Context Window
- **All agents use full 1M context** - no artificial limitations
- **Sophisticated reasoning** - handle complex codebases and requirements
- **Context optimization** - intelligent pruning and caching
- **Thinking blocks preserved** - maintain reasoning across iterations

### 6. Streaming Everything
- **Real-time progress** - see agents working live
- **Git operations** - watch branches being created and merged
- **Cost tracking** - running totals updated continuously
- **Error handling** - immediate feedback on issues

## Admin Access and Analytics

### Privileged Admin User

keen includes a special administrative account for platform oversight and analytics:

**Admin Credentials:**
- **Email:** ahiya.butman@gmail.com
- **Password:** 2con-creator
- **Role:** Super Administrator

**Admin Privileges:**
- **Unlimited credits** - no credit deductions for admin usage
- **Bypass all rate limits** - unrestricted agent execution
- **Full analytics access** - comprehensive platform metrics and insights
- **User management** - view and manage all user accounts
- **System monitoring** - real-time platform health and performance
- **Priority execution** - admin agents get queue priority
- **Advanced diagnostics** - internal system metrics and debugging

The admin account enables platform oversight, debugging user issues, monitoring system health, and gathering usage analytics without credit constraints.

## Target Users

### Individual Developers
- **Solo developers** building complex projects requiring multiple specialized agents
- **Indie developers** who need production-grade development assistance
- **Consultants** managing multiple client projects with isolated workspaces

### Development Teams
- **Small teams** coordinating multiple concurrent development tasks
- **Remote teams** needing shared development workspaces with agent assistance
- **Startup teams** requiring rapid development with limited resources

### Organizations
- **Development departments** automating routine development workflows
- **AI-native development shops** building agent-first development processes
- **Enterprise teams** requiring isolated agent workspaces with compliance

### Integration Partners
- **Tool vendors** integrating agent capabilities into their platforms
- **CI/CD providers** offering autonomous development features
- **IDE vendors** providing embedded agent assistance

## Business Model

### Credit-based Usage (Primary)
- **Pay per execution** - charged based on actual agent usage and token consumption
- **5x markup pricing** - keen credits cost 5 times actual Claude API costs for sustainability
- **Transparent pricing** - clear costs for different types of operations
- **No upfront costs** - only pay for what you use
- **Volume discounts** - reduced rates for heavy usage
- **No packages** - pure credit system without subscription tiers

### Credit Pricing Structure

#### Base Pricing (5x Claude API costs)
- **Standard Context (≤200K tokens):**
  - Input: $0.015 per 1K tokens (Claude: $0.003 × 5)
  - Output: $0.075 per 1K tokens (Claude: $0.015 × 5)
  - Thinking: $0.015 per 1K tokens (Claude: $0.003 × 5)

- **Extended Context (>200K tokens, 1M window):**
  - Input: $0.030 per 1K tokens (Claude: $0.006 × 5)
  - Output: $0.1125 per 1K tokens (Claude: $0.0225 × 5)
  - Thinking: $0.030 per 1K tokens (Claude: $0.006 × 5)

#### Credit Packages (for convenience, not subscriptions)
- **Starter Pack:** $25 → 500 credits
- **Developer Pack:** $100 → 2,200 credits (10% bonus)
- **Professional Pack:** $500 → 12,000 credits (20% bonus)
- **Enterprise Pack:** $2,000 → 50,000 credits (25% bonus)

### Additional Revenue Streams
- **Enterprise custom deployments** - private cloud or on-premise installations
- **API access for integration partners** - white-label agent capabilities
- **Professional services** - custom agent development and consultation
- **Training and certification** - courses on autonomous development practices

## Technology Innovation

### Recursive Agent Spawning
- **First platform** to offer infinite recursive agent spawning
- **Git-based coordination** - novel approach to agent collaboration
- **Automatic scaling** - system complexity scales organically with task complexity
- **Visual representation** - real-time agent tree visualization

### Agent Purity Principle  
- **Complete separation** - agents focus purely on development, never see business logic
- **API gateway abstraction** - handles authentication, billing, rate limiting
- **Clean architecture** - business concerns isolated from agent execution
- **Scalable design** - easy to add new capabilities without agent complexity

### 1M Context Architecture
- **Full context utilization** - no artificial limits on agent reasoning
- **Intelligent management** - automatic optimization for performance
- **Cost optimization** - smart caching and pruning strategies with 5x markup transparency
- **Thinking preservation** - maintain reasoning continuity across sessions

## Market Position

keen positions itself as the **"AWS for Autonomous Development"**:

- **Infrastructure-as-a-Service** for autonomous software development
- **Production-grade reliability** with enterprise security and compliance
- **Developer-first experience** with powerful APIs and integrations
- **Transparent pricing** with clear 5x markup and no hidden costs or vendor lock-in

## Success Metrics

### User Adoption
- **10,000 registered users** within 6 months
- **1,000 paying customers** within 12 months
- **100 enterprise customers** within 18 months

### Usage Metrics
- **1M+ agent executions** per month
- **10M+ code changes** automated through agents
- **99.9% uptime** for platform availability

### Business Metrics
- **$1M ARR** within 12 months
- **$10M ARR** within 24 months
- **80% gross margins** through efficient infrastructure and 5x markup

### Technical Metrics  
- **Sub-second response times** for agent spawning
- **Real-time streaming** with <100ms latency
- **99.99% data isolation** between users
- **Admin analytics** providing comprehensive platform insights

## Vision Statement

**keen democratizes autonomous software development by providing a production-grade, multi-tenant platform that enables developers worldwide to harness the power of recursive AI agents with complete transparency, real-time visibility, enterprise-grade reliability, and straightforward credit-based pricing.**

keen transforms software development from a manual, time-intensive process into an intelligent, collaborative effort between humans and autonomous agents, making sophisticated development capabilities accessible to developers of all skill levels and team sizes while maintaining complete administrative oversight and analytics capabilities.

With its revolutionary credit system (no packages), 1M context windows, and privileged admin access for platform management, keen sets a new standard for autonomous development platforms.