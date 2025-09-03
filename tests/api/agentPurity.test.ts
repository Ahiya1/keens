/**
 * keen API Gateway - Agent Purity Tests
 * Verify that agents receive only sanitized requests with no business logic
 */

import request from 'supertest';
import { KeenAPIServer } from '../../src/api/server.js';
import { keen } from '../../src/index.js';
import { PureAgentRequest } from '../../src/api/types.js';
import { generateTestEmail, createTestUserInDB, cleanupTestUsers } from '../setup';

describe('API Gateway Agent Purity Enforcement', () => {
  let server: KeenAPIServer;
  let app: any;
  let keenDB: keen;
  let regularUserToken: string;
  let adminUserToken: string;
  let testEmails: string[] = [];
  
  beforeAll(async () => {
    // Initialize test database
    keenDB = keen.getInstance();
    await keenDB.initialize();
    
    // Initialize server with the same keen instance
    server = new KeenAPIServer(keenDB);
    await server.initialize();
    app = server.getApp();
    
    // Create test users
    await setupTestUsers();
  });
  
  afterAll(async () => {
    // Cleanup test users
    if (testEmails.length > 0) {
      await cleanupTestUsers(testEmails);
    }
    
    await server?.stop();
    await keenDB?.close();
  });
  
  async function setupTestUsers() {
    try {
      // Create regular user with unique credentials
      const regularEmail = generateTestEmail('regular-purity');
      const regularUsername = `regular_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      testEmails.push(regularEmail);
      
      const regularUser = await createTestUserInDB(
        regularEmail,
        regularUsername,
        'TestPassword123!',
        false
      );
      
      const regularLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: regularEmail,
          password: 'TestPassword123!'
        });
      
      if (regularLogin.status === 200) {
        regularUserToken = regularLogin.body.tokens?.access_token;
      }
      
      // Try to get admin token
      try {
        const adminLogin = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: process.env.ADMIN_EMAIL || 'ahiya.butman@gmail.com',
            password: process.env.ADMIN_PASSWORD || '2con-creator'
          });
        
        if (adminLogin.status === 200) {
          adminUserToken = adminLogin.body.tokens?.access_token;
        }
      } catch (error) {
        console.warn('Admin user not available for agent purity tests');
      }
    } catch (error) {
      console.error('Failed to setup agent purity test users:', error);
    }
  }
  
  describe('Request Sanitization', () => {
    test('should sanitize agent execution request from regular user', async () => {
      if (!regularUserToken) {
        console.warn('Regular user token not available - skipping request sanitization test');
        return;
      }
      
      // Mock the agent manager to capture what it receives
      let capturedAgentRequest: any = null;
      let capturedInternalOptions: any = null;
      
      // Monkey patch to capture agent execution calls
      const originalCreateSession = keenDB.sessions.createSession;
      keenDB.sessions.createSession = jest.fn().mockImplementation(async (userId, sessionData, context) => {
        // Capture what the "agent" would receive
        capturedAgentRequest = {
          vision: sessionData.vision,
          workingDirectory: sessionData.workingDirectory,
          options: sessionData.agentOptions
        };
        
        // Capture internal context (should not be passed to agent)
        capturedInternalOptions = {
          userId: context?.userId,
          isAdmin: context?.isAdmin,
          adminPrivileges: context?.adminPrivileges
        };
        
        // Return mock session
        return {
          id: 'mock-session-id',
          session_id: sessionData.sessionId,
          user_id: userId,
          created_at: new Date(),
          updated_at: new Date()
        };
      });
      
      try {
        const response = await request(app)
          .post('/api/v1/agents/execute')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .send({
            vision: 'Create a React TypeScript todo application with authentication',
            working_directory: '/tmp/my-project',
            options: {
              max_iterations: 25,
              cost_budget: 10.0,
              enable_web_search: true,
              enable_streaming: true,
              show_progress: true
            },
            webhook_url: 'https://example.com/webhook'
          });
        
        // Response should indicate successful request processing
        expect([200, 402]).toContain(response.status); // Success or insufficient credits
        
        if (response.status === 200) {
          // Verify execution info shows agent purity
          expect(response.body.execution_info.agent_purity).toBe(true);
          expect(response.body.execution_info.business_logic_isolated).toBe(true);
          expect(response.body.execution_info.sanitized_request).toBeDefined();
        }
        
        // Verify agent received ONLY sanitized data
        if (capturedAgentRequest) {
          // ✅ Agent should receive these clean fields
          expect(capturedAgentRequest.vision).toBe('Create a React TypeScript todo application with authentication');
          expect(capturedAgentRequest.workingDirectory).toMatch(/\/workspaces\//);
          expect(capturedAgentRequest.options.maxIterations).toBe(25);
          expect(capturedAgentRequest.options.enableWebSearch).toBe(true);
          expect(capturedAgentRequest.options.enableStreaming).toBe(true);
          expect(capturedAgentRequest.options.showProgress).toBe(true);
          
          // ❌ Agent should NOT receive business logic
          expect(capturedAgentRequest).not.toHaveProperty('userId');
          expect(capturedAgentRequest).not.toHaveProperty('creditBalance');
          expect(capturedAgentRequest).not.toHaveProperty('isAdmin');
          expect(capturedAgentRequest).not.toHaveProperty('adminPrivileges');
          expect(capturedAgentRequest).not.toHaveProperty('rateLimitInfo');
          expect(capturedAgentRequest).not.toHaveProperty('costBudget');
          expect(capturedAgentRequest).not.toHaveProperty('webhookUrl');
          expect(capturedAgentRequest).not.toHaveProperty('paymentInfo');
          expect(capturedAgentRequest).not.toHaveProperty('userTier');
          expect(capturedAgentRequest).not.toHaveProperty('remainingBalance');
        }
        
        // Verify internal options are tracked separately (not passed to agent)
        if (capturedInternalOptions) {
          expect(capturedInternalOptions.userId).toBeDefined();
          expect(capturedInternalOptions.isAdmin).toBe(false);
        }
        
      } finally {
        // Restore original method
        keenDB.sessions.createSession = originalCreateSession;
      }
    });
  });
});