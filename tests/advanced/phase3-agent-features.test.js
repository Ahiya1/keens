"use strict";
/**
 * Phase 3.3 Agent Features Advanced Test Suite
 * Comprehensive tests for recursive agent spawning, coordination, and management
 */
describe('Phase 3.3 Advanced Agent Features', () => {
    describe('Recursive Agent Spawning', () => {
        it('should support multi-level agent hierarchies', () => {
            // Simulate a complex agent hierarchy
            const rootAgent = {
                sessionId: 'root-general',
                level: 0,
                children: [],
                specialization: 'general',
                status: 'running',
                spawnedAt: new Date('2024-01-01T00:00:00Z'),
            };
            // Level 1 agents
            const frontendAgent = {
                sessionId: 'frontend-001',
                level: 1,
                parentId: 'root-general',
                children: [],
                specialization: 'frontend',
                status: 'running',
                spawnedAt: new Date('2024-01-01T00:05:00Z'),
            };
            const backendAgent = {
                sessionId: 'backend-001',
                level: 1,
                parentId: 'root-general',
                children: [],
                specialization: 'backend',
                status: 'completed',
                spawnedAt: new Date('2024-01-01T00:10:00Z'),
            };
            // Level 2 agents (spawned by frontend agent)
            const testingAgent = {
                sessionId: 'testing-001',
                level: 2,
                parentId: 'frontend-001',
                children: [],
                specialization: 'testing',
                status: 'running',
                spawnedAt: new Date('2024-01-01T00:15:00Z'),
            };
            // Build hierarchy
            frontendAgent.children.push(testingAgent);
            rootAgent.children.push(frontendAgent, backendAgent);
            // Test hierarchy structure
            expect(rootAgent.level).toBe(0);
            expect(rootAgent.children).toHaveLength(2);
            expect(frontendAgent.level).toBe(1);
            expect(frontendAgent.children).toHaveLength(1);
            expect(testingAgent.level).toBe(2);
            expect(testingAgent.parentId).toBe('frontend-001');
            // Test hierarchy traversal
            function countTotalAgents(agent) {
                return 1 + agent.children.reduce((sum, child) => sum + countTotalAgents(child), 0);
            }
            function getMaxDepth(agent) {
                if (agent.children.length === 0)
                    return agent.level;
                return Math.max(...agent.children.map(child => getMaxDepth(child)));
            }
            expect(countTotalAgents(rootAgent)).toBe(4);
            expect(getMaxDepth(rootAgent)).toBe(2);
        });
        it('should manage agent coordination and sequential execution', async () => {
            // Simulate agent execution coordination
            const executionPlan = [
                {
                    sessionId: 'root-001',
                    dependencies: [],
                    estimatedDuration: 300, // 5 minutes
                    priority: 1,
                    canExecuteInParallel: false,
                },
                {
                    sessionId: 'database-001',
                    dependencies: ['root-001'],
                    estimatedDuration: 180, // 3 minutes
                    priority: 2,
                    canExecuteInParallel: false,
                },
                {
                    sessionId: 'frontend-001',
                    dependencies: ['database-001'],
                    estimatedDuration: 240, // 4 minutes
                    priority: 3,
                    canExecuteInParallel: true,
                },
                {
                    sessionId: 'backend-001',
                    dependencies: ['database-001'],
                    estimatedDuration: 360, // 6 minutes
                    priority: 3,
                    canExecuteInParallel: true,
                },
            ];
            // Simulate execution coordinator
            const coordinator = {
                executionOrder: [],
                completed: new Set(),
                canExecute(sessionId) {
                    const plan = executionPlan.find(p => p.sessionId === sessionId);
                    if (!plan)
                        return false;
                    return plan.dependencies.every(dep => this.completed.has(dep));
                },
                execute(sessionId) {
                    if (this.canExecute(sessionId)) {
                        this.executionOrder.push(sessionId);
                        this.completed.add(sessionId);
                    }
                },
                executeAll() {
                    const remaining = executionPlan
                        .filter(p => !this.completed.has(p.sessionId))
                        .sort((a, b) => a.priority - b.priority);
                    let progress = true;
                    while (progress && remaining.length > 0) {
                        progress = false;
                        for (let i = remaining.length - 1; i >= 0; i--) {
                            const plan = remaining[i];
                            if (this.canExecute(plan.sessionId)) {
                                this.execute(plan.sessionId);
                                remaining.splice(i, 1);
                                progress = true;
                            }
                        }
                    }
                }
            };
            coordinator.executeAll();
            expect(coordinator.executionOrder).toEqual([
                'root-001',
                'database-001',
                'frontend-001',
                'backend-001'
            ]);
            expect(coordinator.completed.size).toBe(4);
        });
    });
    describe('Agent Communication and State Management', () => {
        it('should handle agent state transitions', () => {
            class AgentStateManager {
                currentState = 'spawned';
                history = [];
                transition(to, metadata) {
                    const validTransitions = {
                        'spawned': ['initializing', 'failed'],
                        'initializing': ['exploring', 'failed'],
                        'exploring': ['planning', 'failed'],
                        'planning': ['founding', 'failed'],
                        'founding': ['summoning', 'completing', 'failed'],
                        'summoning': ['completing', 'failed'],
                        'completing': ['completed', 'failed'],
                        'completed': [],
                        'failed': [],
                    };
                    if (validTransitions[this.currentState].includes(to)) {
                        this.history.push({
                            from: this.currentState,
                            to,
                            timestamp: new Date(),
                            metadata,
                        });
                        this.currentState = to;
                        return true;
                    }
                    return false;
                }
                getCurrentState() {
                    return this.currentState;
                }
                getHistory() {
                    return [...this.history];
                }
                getDuration() {
                    if (this.history.length === 0)
                        return 0;
                    const start = this.history[0].timestamp;
                    const end = this.history[this.history.length - 1].timestamp;
                    return end.getTime() - start.getTime();
                }
            }
            const stateManager = new AgentStateManager();
            // Test valid transitions
            expect(stateManager.transition('initializing')).toBe(true);
            expect(stateManager.getCurrentState()).toBe('initializing');
            expect(stateManager.transition('exploring')).toBe(true);
            expect(stateManager.transition('planning')).toBe(true);
            expect(stateManager.transition('founding')).toBe(true);
            expect(stateManager.transition('completing')).toBe(true);
            expect(stateManager.transition('completed')).toBe(true);
            // Test invalid transition
            expect(stateManager.transition('exploring')).toBe(false);
            expect(stateManager.getCurrentState()).toBe('completed');
            // Test history
            const history = stateManager.getHistory();
            expect(history).toHaveLength(6);
            expect(history[0].from).toBe('spawned');
            expect(history[0].to).toBe('initializing');
            expect(history[5].to).toBe('completed');
        });
        it('should support inter-agent messaging', () => {
            class AgentMessageBus {
                messages = [];
                subscribers = new Map();
                send(message) {
                    const fullMessage = {
                        ...message,
                        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                        timestamp: new Date(),
                    };
                    this.messages.push(fullMessage);
                    // Notify subscribers
                    const subscribers = this.subscribers.get(message.toSessionId) || [];
                    subscribers.forEach(callback => callback(fullMessage));
                    return fullMessage.id;
                }
                subscribe(sessionId, callback) {
                    if (!this.subscribers.has(sessionId)) {
                        this.subscribers.set(sessionId, []);
                    }
                    this.subscribers.get(sessionId).push(callback);
                }
                getMessagesForSession(sessionId) {
                    return this.messages.filter(m => m.toSessionId === sessionId);
                }
                getMessageHistory() {
                    return [...this.messages];
                }
            }
            const messageBus = new AgentMessageBus();
            const receivedMessages = [];
            // Subscribe to messages
            messageBus.subscribe('child-001', (message) => {
                receivedMessages.push(message);
            });
            // Send messages
            const messageId1 = messageBus.send({
                fromSessionId: 'parent-001',
                toSessionId: 'child-001',
                type: 'request',
                payload: { action: 'analyze_file', file: 'test.ts' },
            });
            const messageId2 = messageBus.send({
                fromSessionId: 'child-001',
                toSessionId: 'parent-001',
                type: 'response',
                payload: { status: 'completed', result: { linesOfCode: 150 } },
            });
            // Test message delivery
            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0].fromSessionId).toBe('parent-001');
            expect(receivedMessages[0].payload.action).toBe('analyze_file');
            // Test message history
            const allMessages = messageBus.getMessageHistory();
            expect(allMessages).toHaveLength(2);
            expect(allMessages[1].type).toBe('response');
        });
    });
    describe('Agent Resource Management', () => {
        it('should manage computational resources across agents', () => {
            class ResourceManager {
                totalCpuUnits = 100;
                totalMemoryMB = 8192;
                totalBudgetUSD = 50.0;
                allocations = new Map();
                allocate(sessionId, request) {
                    const currentUsage = this.getCurrentUsage();
                    if (currentUsage.cpu + request.cpuUnits <= this.totalCpuUnits &&
                        currentUsage.memory + request.memoryMB <= this.totalMemoryMB &&
                        currentUsage.budget + request.maxCostUSD <= this.totalBudgetUSD) {
                        this.allocations.set(sessionId, { sessionId, ...request });
                        return true;
                    }
                    return false;
                }
                deallocate(sessionId) {
                    return this.allocations.delete(sessionId);
                }
                getCurrentUsage() {
                    const allocations = Array.from(this.allocations.values());
                    return {
                        cpu: allocations.reduce((sum, a) => sum + a.cpuUnits, 0),
                        memory: allocations.reduce((sum, a) => sum + a.memoryMB, 0),
                        budget: allocations.reduce((sum, a) => sum + a.maxCostUSD, 0),
                    };
                }
                getAvailable() {
                    const usage = this.getCurrentUsage();
                    return {
                        cpu: this.totalCpuUnits - usage.cpu,
                        memory: this.totalMemoryMB - usage.memory,
                        budget: this.totalBudgetUSD - usage.budget,
                    };
                }
            }
            const resourceManager = new ResourceManager();
            // Test successful allocations
            expect(resourceManager.allocate('agent-1', {
                cpuUnits: 20,
                memoryMB: 1024,
                maxCostUSD: 10.0,
                priority: 1,
            })).toBe(true);
            expect(resourceManager.allocate('agent-2', {
                cpuUnits: 30,
                memoryMB: 2048,
                maxCostUSD: 15.0,
                priority: 2,
            })).toBe(true);
            // Test resource limits
            expect(resourceManager.allocate('agent-3', {
                cpuUnits: 60, // Would exceed total CPU
                memoryMB: 1000,
                maxCostUSD: 10.0,
                priority: 3,
            })).toBe(false);
            // Test current usage
            const usage = resourceManager.getCurrentUsage();
            expect(usage.cpu).toBe(50);
            expect(usage.memory).toBe(3072);
            expect(usage.budget).toBe(25.0);
            // Test deallocation
            expect(resourceManager.deallocate('agent-1')).toBe(true);
            const newUsage = resourceManager.getCurrentUsage();
            expect(newUsage.cpu).toBe(30);
            expect(newUsage.budget).toBe(15.0);
        });
    });
});
//# sourceMappingURL=phase3-agent-features.test.js.map