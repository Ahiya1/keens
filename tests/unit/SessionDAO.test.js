/**
 * SessionDAO Unit Tests
 * Tests session management with messages, thinking blocks, and conversation summaries
 */
import { v4 as uuidv4 } from 'uuid';
import { SessionDAO } from '../../src/database/dao/SessionDAO.js';
// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-1234')
}));
const mockUuid = uuidv4;
// Mock DatabaseManager with comprehensive session support
class MockDatabaseManager {
    sessions = [];
    messages = [];
    thinkingBlocks = [];
    summaries = [];
    uuidCounter = 1;
    generateUuid() {
        return `mock-uuid-${this.uuidCounter++}`;
    }
    async query(text, params, context) {
        // Session creation - FIXED: Proper parameter mapping
        if (text.includes('INSERT INTO agent_sessions')) {
            const session = {
                id: params?.[0] || this.generateUuid(),
                user_id: params?.[1],
                session_id: params?.[2],
                parent_session_id: params?.[3],
                session_depth: params?.[4] || 0,
                git_branch: params?.[5],
                vision: params?.[6],
                working_directory: params?.[7],
                current_phase: 'EXPLORE',
                start_time: params?.[8] || new Date(), // FIXED: Use the timestamp parameter
                end_time: null,
                last_activity_at: params?.[8] || new Date(),
                phase_started_at: params?.[8] || new Date(),
                iteration_count: 0,
                tool_calls_count: 0,
                total_cost: 0,
                tokens_used: 0,
                context_window_size: 1000000,
                files_modified: [],
                files_created: [],
                files_deleted: [],
                execution_status: 'running',
                success: null,
                error_message: null,
                completion_report: null,
                streaming_enabled: true,
                streaming_time: null,
                websocket_connections: [],
                agent_options: params?.[9] || {}, // FIXED: Correct parameter index for agent_options
                api_calls_data: [],
                cost_breakdown: {},
                total_api_cost: 0,
                created_at: new Date(),
                updated_at: new Date()
            };
            this.sessions.push(session);
            return [session];
        }
        // Get session by ID
        if (text.includes('SELECT * FROM agent_sessions WHERE id')) {
            const sessionId = params?.[0];
            const session = this.sessions.find(s => s.id === sessionId);
            return session ? [session] : [];
        }
        // Update session
        if (text.includes('UPDATE agent_sessions')) {
            const sessionId = params?.[params.length - 1]; // Last parameter is the WHERE condition
            const session = this.sessions.find(s => s.id === sessionId);
            if (session) {
                const setClause = text.match(/SET\s+(.*?)\s+WHERE/i)?.[1] || '';
                let paramIdx = 0;
                if (setClause.includes('current_phase')) {
                    session.current_phase = params?.[paramIdx++];
                    session.phase_started_at = new Date();
                }
                session.last_activity_at = new Date();
                session.updated_at = new Date();
                return [session];
            }
            return [];
        }
        return [];
    }
    async transaction(callback, context) {
        return await callback(this);
    }
}
describe('SessionDAO', () => {
    let sessionDAO;
    let mockDb;
    beforeEach(() => {
        jest.clearAllMocks();
        mockDb = new MockDatabaseManager();
        sessionDAO = new SessionDAO(mockDb);
        mockUuid.mockReturnValue('mock-uuid-1234');
    });
    describe('createSession', () => {
        it('should create new session successfully', async () => {
            const userId = 'user-123';
            const request = {
                sessionId: 'session-456',
                gitBranch: 'main',
                vision: 'Test project vision',
                workingDirectory: '/test/dir',
                agentOptions: { debug: true }
            };
            const session = await sessionDAO.createSession(userId, request);
            expect(session.user_id).toBe(userId);
            expect(session.session_id).toBe(request.sessionId);
            expect(session.git_branch).toBe(request.gitBranch);
            expect(session.vision).toBe(request.vision);
            expect(session.working_directory).toBe(request.workingDirectory);
            expect(session.agent_options).toEqual(request.agentOptions);
            expect(session.session_depth).toBe(0);
            expect(session.current_phase).toBe('EXPLORE');
            expect(session.execution_status).toBe('running');
        });
    });
    describe('updateSession', () => {
        let sessionId;
        beforeEach(async () => {
            const session = await sessionDAO.createSession('user-123', {
                sessionId: 'test-session',
                gitBranch: 'main',
                vision: 'Test vision',
                workingDirectory: '/test/dir'
            });
            sessionId = session.id;
        });
        it('should update session phase', async () => {
            const updates = {
                currentPhase: 'PLAN'
            };
            await sessionDAO.updateSession(sessionId, updates);
            const updatedSession = await sessionDAO.getSession(sessionId);
            expect(updatedSession?.current_phase).toBe('PLAN');
        });
    });
});
//# sourceMappingURL=SessionDAO.test.js.map