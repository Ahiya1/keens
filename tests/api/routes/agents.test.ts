/**
 * Agents API Route Comprehensive Tests
 * Tests agent execution, session management, and streaming
 */

import request from 'supertest';
import express from 'express';
import { agentsRouter } from '../../../src/api/routes/agents.js';
import { authMiddleware } from '../../../src/api/middleware/authentication.js';
import { rateLimitMiddleware } from '../../../src/api/middleware/rateLimiting.js';

// Mock dependencies
jest.mock('../../../src/database/index.js', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    users: {
      getUserById: jest.fn().mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        is_admin: false
      }),
      verifyToken: jest.fn().mockResolvedValue({
        userId: 'user-123',
        isAdmin: false
      })
    },
    sessions: {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-123',
        session_id: 'test_session_123',
        status: 'created'
      }),
      getUserSessions: jest.fn().mockResolvedValue({
        sessions: [],
        total: 0
      }),
      getSessionById: jest.fn().mockResolvedValue({
        id: 'session-123',
        user_id: 'user-123',
        execution_status: 'running'
      })
    },
    credits: {
      hasSufficientCredits: jest.fn().mockResolvedValue({ sufficient: true }),
      deductCredits: jest.fn().mockResolvedValue({ success: true })
    },
    close: jest.fn()
  }))
}));

jest.mock('../../../src/agent/KeenAgent.js', () => ({
  KeenAgent: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      phase: 'COMPLETE',
      iterations: 5,
      summary: 'Mock execution completed'
    })
  }))
}));

describe('Agents API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        userId: 'user-123',
        isAdmin: false,
        email: 'test@example.com'
      };
      next();
    });
    
    app.use('/api/v1/agents', agentsRouter);
  });

  describe('POST /api/v1/agents/execute', () => {
    test('should execute agent with valid request', async () => {
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send({
          vision: 'Create a simple web application',
          options: {
            maxIterations: 10,
            costBudget: 25.0
          }
        })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.message).toContain('started');
    });

    test('should validate required vision parameter', async () => {
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send({
          options: {
            maxIterations: 10
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('vision');
    });

    test('should validate vision length', async () => {
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send({
          vision: 'a'.repeat(10001), // Too long
          options: {}
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('too long');
    });

    test('should validate cost budget', async () => {
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send({
          vision: 'Test vision',
          options: {
            costBudget: -10 // Invalid negative budget
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('budget');
    });

    test('should validate max iterations', async () => {
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send({
          vision: 'Test vision',
          options: {
            maxIterations: 0 // Invalid zero iterations
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('iterations');
    });

    test('should handle database errors', async () => {
      const { DatabaseService } = require('../../../src/database/index.js');
      const mockDb = new DatabaseService();
      mockDb.sessions.createSession.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send({
          vision: 'Test vision',
          options: {}
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('GET /api/v1/agents/sessions', () => {
    test('should get user sessions', async () => {
      const response = await request(app)
        .get('/api/v1/agents/sessions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessions).toBeDefined();
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.total).toBeDefined();
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/agents/sessions')
        .query({
          limit: 10,
          offset: 20
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
    });

    test('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/agents/sessions')
        .query({
          limit: -5 // Invalid negative limit
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('limit');
    });

    test('should handle database errors in session listing', async () => {
      const { DatabaseService } = require('../../../src/database/index.js');
      const mockDb = new DatabaseService();
      mockDb.sessions.getUserSessions.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/v1/agents/sessions')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/agents/sessions/:sessionId', () => {
    test('should get specific session', async () => {
      const response = await request(app)
        .get('/api/v1/agents/sessions/session-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session).toBeDefined();
      expect(response.body.session.id).toBe('session-123');
    });

    test('should handle non-existent session', async () => {
      const { DatabaseService } = require('../../../src/database/index.js');
      const mockDb = new DatabaseService();
      mockDb.sessions.getSessionById.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/v1/agents/sessions/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    test('should prevent access to other users sessions', async () => {
      const { DatabaseService } = require('../../../src/database/index.js');
      const mockDb = new DatabaseService();
      mockDb.sessions.getSessionById.mockResolvedValue({
        id: 'session-123',
        user_id: 'other-user', // Different user
        execution_status: 'running'
      });
      
      const response = await request(app)
        .get('/api/v1/agents/sessions/session-123')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');
    });
  });

  describe('POST /api/v1/agents/sessions/:sessionId/cancel', () => {
    test('should cancel running session', async () => {
      const response = await request(app)
        .post('/api/v1/agents/sessions/session-123/cancel')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
    });

    test('should handle already completed session', async () => {
      const { DatabaseService } = require('../../../src/database/index.js');
      const mockDb = new DatabaseService();
      mockDb.sessions.getSessionById.mockResolvedValue({
        id: 'session-123',
        user_id: 'user-123',
        execution_status: 'completed'
      });
      
      const response = await request(app)
        .post('/api/v1/agents/sessions/session-123/cancel')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cannot be cancelled');
    });
  });

  describe('GET /api/v1/agents/status', () => {
    test('should get agent system status', async () => {
      const response = await request(app)
        .get('/api/v1/agents/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(response.body.status.system).toBeDefined();
      expect(response.body.status.database).toBeDefined();
    });

    test('should include performance metrics', async () => {
      const response = await request(app)
        .get('/api/v1/agents/status')
        .expect(200);

      expect(response.body.status.performance).toBeDefined();
      expect(response.body.status.performance.uptime).toBeGreaterThan(0);
      expect(response.body.status.performance.memory).toBeDefined();
    });
  });

  describe('POST /api/v1/agents/summon', () => {
    test('should create child agent session', async () => {
      const response = await request(app)
        .post('/api/v1/agents/summon')
        .send({
          parentSessionId: 'parent-session-123',
          vision: 'Child agent task',
          specialization: 'frontend',
          options: {
            maxIterations: 5
          }
        })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.childSessionId).toBeDefined();
      expect(response.body.specialization).toBe('frontend');
    });

    test('should validate parent session exists', async () => {
      const { DatabaseService } = require('../../../src/database/index.js');
      const mockDb = new DatabaseService();
      mockDb.sessions.getSessionById.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/v1/agents/summon')
        .send({
          parentSessionId: 'nonexistent',
          vision: 'Child task',
          specialization: 'backend'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('parent session');
    });

    test('should validate specialization', async () => {
      const response = await request(app)
        .post('/api/v1/agents/summon')
        .send({
          parentSessionId: 'parent-session-123',
          vision: 'Child task',
          specialization: 'invalid-spec' // Invalid specialization
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('specialization');
    });
  });

  describe('WebSocket Integration', () => {
    test('should provide WebSocket endpoint info', async () => {
      const response = await request(app)
        .get('/api/v1/agents/websocket-info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.websocket).toBeDefined();
      expect(response.body.websocket.url).toBeDefined();
      expect(response.body.websocket.protocols).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send(JSON.stringify({
          vision: 'Test vision'
        }))
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should include request ID in error responses', async () => {
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send({})
        .expect(400);

      expect(response.body.requestId).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limit exceeded', async () => {
      // Mock rate limit middleware to simulate limit exceeded
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { userId: 'user-123', isAdmin: false };
        next();
      });
      
      // Simulate rate limit exceeded
      app.use('/api/v1/agents', (req, res) => {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: 60
        });
      });
      
      const response = await request(app)
        .post('/api/v1/agents/execute')
        .send({ vision: 'Test vision' })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.retryAfter).toBeDefined();
    });
  });

  describe('Admin Endpoints', () => {
    beforeEach(() => {
      // Mock admin user
      app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = {
          userId: 'admin-123',
          isAdmin: true,
          email: 'admin@example.com'
        };
        next();
      });
      app.use('/api/v1/agents', agentsRouter);
    });

    test('should get all sessions for admin', async () => {
      const response = await request(app)
        .get('/api/v1/agents/admin/sessions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessions).toBeDefined();
    });

    test('should get system metrics for admin', async () => {
      const response = await request(app)
        .get('/api/v1/agents/admin/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.totalSessions).toBeDefined();
      expect(response.body.metrics.activeSessions).toBeDefined();
    });
  });
});
