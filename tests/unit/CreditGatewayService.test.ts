/**
 * Credit Gateway Service Tests - Comprehensive Backend Testing
 * Testing credit validation, reservation, and admin bypass functionality
 */

import Decimal from 'decimal.js';
import { CreditGatewayService } from '../../src/api/services/CreditGatewayService.js';
import { CreditDAO } from '../../src/database/dao/CreditDAO.js';
import { UserDAO } from '../../src/database/dao/UserDAO.js';
import { DatabaseManager } from '../../src/database/DatabaseManager.js';
import { InsufficientCreditsError } from '../../src/api/types.js';

// Mock the dependencies
jest.mock('../../src/database/dao/CreditDAO.js');
jest.mock('../../src/database/dao/UserDAO.js');
jest.mock('../../src/database/DatabaseManager.js');

describe('CreditGatewayService', () => {
  let creditGatewayService: CreditGatewayService;
  let mockCreditDAO: jest.Mocked<CreditDAO>;
  let mockUserDAO: jest.Mocked<UserDAO>;
  let mockDB: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    // Create mocked instances
    mockCreditDAO = new CreditDAO({} as any) as jest.Mocked<CreditDAO>;
    mockUserDAO = new UserDAO({} as any) as jest.Mocked<UserDAO>;
    mockDB = new DatabaseManager({} as any) as jest.Mocked<DatabaseManager>;
    
    creditGatewayService = new CreditGatewayService(mockCreditDAO, mockUserDAO, mockDB);

    // Setup default mocks
    mockDB.query = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndReserveCredits', () => {
    const mockAgentRequest = {
      vision: 'Create a simple todo application with React',
      workingDirectory: '/tmp/test',
      options: {
        maxIterations: 50,
        costBudget: 100,
        enableWebSearch: true,
        enableStreaming: true,
        showProgress: true,
        startingPhase: 'EXPLORE' as const
      }
    };

    test('should allow admin users with unlimited credits', async () => {
      const userId = 'admin-user-123';
      const context = { userId, isAdmin: true, adminPrivileges: {} };

      // Mock admin check
      mockDB.query.mockResolvedValueOnce([{
        is_admin: true,
        admin_privileges: { unlimited_credits: true }
      }]);

      const result = await creditGatewayService.validateAndReserveCredits(
        userId,
        mockAgentRequest,
        context
      );

      expect(result.isAdmin).toBe(true);
      expect(result.unlimited).toBe(true);
      expect(result.reservedAmount).toBe(0);
      expect(result.estimatedCost).toBe(0);
      expect(result.reservationId).toContain('admin_bypass_');
    });

    test('should validate sufficient credits for regular users', async () => {
      const userId = 'regular-user-123';
      const context = { userId, isAdmin: false };

      // Mock non-admin user
      mockDB.query.mockResolvedValueOnce([{
        is_admin: false,
        admin_privileges: {}
      }]);

      // Mock credit account with sufficient balance
      const mockAccount = {
        current_balance: new Decimal(500),
        reserved_balance: new Decimal(0),
        lifetime_purchased: new Decimal(1000),
        lifetime_spent: new Decimal(500),
        unlimited_credits: false,
        daily_limit: null,
        auto_recharge_enabled: false
      };

      mockCreditDAO.getCreditAccount = jest.fn().mockResolvedValue(mockAccount);

      // Mock transaction history for daily usage
      mockDB.query.mockResolvedValueOnce([{ daily_spent: 0 }]);

      const result = await creditGatewayService.validateAndReserveCredits(
        userId,
        mockAgentRequest,
        context
      );

      expect(result.isAdmin).toBeUndefined();
      expect(result.unlimited).toBeUndefined();
      expect(result.reservedAmount).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.markupMultiplier).toBe(5.0);
      expect(result.remainingBalance).toBeGreaterThan(0);
    });

    test('should throw InsufficientCreditsError when balance is low', async () => {
      const userId = 'poor-user-123';
      const context = { userId, isAdmin: false };

      // Mock non-admin user
      mockDB.query.mockResolvedValueOnce([{
        is_admin: false,
        admin_privileges: {}
      }]);

      // Mock credit account with insufficient balance
      const mockAccount = {
        current_balance: new Decimal(1), // Very low balance
        reserved_balance: new Decimal(0),
        lifetime_purchased: new Decimal(10),
        lifetime_spent: new Decimal(9),
        unlimited_credits: false,
        daily_limit: null,
        auto_recharge_enabled: false
      };

      mockCreditDAO.getCreditAccount = jest.fn().mockResolvedValue(mockAccount);

      // Mock transaction history for daily usage
      mockDB.query.mockResolvedValueOnce([{ daily_spent: 0 }]);

      await expect(
        creditGatewayService.validateAndReserveCredits(userId, mockAgentRequest, context)
      ).rejects.toThrow('Insufficient credits');
    });

    test('should handle high complexity vision requests', async () => {
      const userId = 'regular-user-456';
      const context = { userId, isAdmin: false };
      
      const complexRequest = {
        ...mockAgentRequest,
        vision: 'Create a complex microservices architecture with PostgreSQL database, JWT authentication, Redis caching, Docker deployment, comprehensive testing with Jest and Cypress, performance optimization, and scalable API design with advanced features',
        options: {
          ...mockAgentRequest.options,
          maxIterations: 100 // Higher iterations
        }
      };

      // Mock non-admin user
      mockDB.query.mockResolvedValueOnce([{
        is_admin: false,
        admin_privileges: {}
      }]);

      // Mock credit account with high balance
      const mockAccount = {
        current_balance: new Decimal(1000),
        reserved_balance: new Decimal(0),
        lifetime_purchased: new Decimal(2000),
        lifetime_spent: new Decimal(1000),
        unlimited_credits: false,
        daily_limit: null,
        auto_recharge_enabled: false
      };

      mockCreditDAO.getCreditAccount = jest.fn().mockResolvedValue(mockAccount);
      mockDB.query.mockResolvedValueOnce([{ daily_spent: 0 }]);

      const result = await creditGatewayService.validateAndReserveCredits(
        userId,
        complexRequest,
        context
      );

      // Complex requests should cost more
      expect(result.estimatedCost).toBeGreaterThan(10);
      expect(result.claudeCost).toBeGreaterThan(2);
    });
  });

  describe('finalizeCredits', () => {
    test('should handle admin bypass finalization', async () => {
      const userId = 'admin-user-123';
      const reservationId = 'admin_bypass_12345';
      const actualClaudeCost = new Decimal(2.5);
      const sessionId = 'session-456';
      const context = { userId, isAdmin: true };

      // Mock admin check
      mockDB.query.mockResolvedValueOnce([{
        is_admin: true,
        admin_privileges: { unlimited_credits: true }
      }]);

      const mockTransaction = {
        id: 'txn-789',
        user_id: userId,
        amount: new Decimal(0),
        transaction_type: 'admin_bypass',
        claude_cost_usd: actualClaudeCost,
        is_admin_bypass: true,
        created_at: new Date()
      };

      mockCreditDAO.deductCredits = jest.fn().mockResolvedValue(mockTransaction);

      const result = await creditGatewayService.finalizeCredits(
        userId,
        reservationId,
        actualClaudeCost,
        sessionId,
        context
      );

      expect(result.is_admin_bypass).toBe(true);
      expect(mockCreditDAO.deductCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          claudeCostUSD: actualClaudeCost,
          sessionId,
          description: '[ADMIN BYPASS] Agent execution completed',
          metadata: expect.objectContaining({
            admin_bypass: true
          })
        }),
        context
      );
    });

    test('should finalize credits for regular users', async () => {
      const userId = 'regular-user-123';
      const reservationId = 'res_12345';
      const actualClaudeCost = new Decimal(1.2);
      const sessionId = 'session-789';
      const context = { userId, isAdmin: false };

      // Mock non-admin check
      mockDB.query.mockResolvedValueOnce([{
        is_admin: false,
        admin_privileges: {}
      }]);

      const mockTransaction = {
        id: 'txn-456',
        user_id: userId,
        amount: new Decimal(-6), // 1.2 * 5 = 6 credits deducted
        transaction_type: 'usage',
        claude_cost_usd: actualClaudeCost,
        is_admin_bypass: false,
        created_at: new Date()
      };

      mockCreditDAO.deductCredits = jest.fn().mockResolvedValue(mockTransaction);

      const result = await creditGatewayService.finalizeCredits(
        userId,
        reservationId,
        actualClaudeCost,
        sessionId,
        context
      );

      expect(result.is_admin_bypass).toBe(false);
      expect(mockCreditDAO.deductCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          claudeCostUSD: actualClaudeCost,
          sessionId,
          description: 'Agent execution completed'
        }),
        context
      );
    });
  });

  describe('getBalance', () => {
    test('should return complete balance information', async () => {
      const userId = 'test-user-123';
      const context = { userId, isAdmin: false };

      const mockAccount = {
        current_balance: new Decimal(250),
        lifetime_purchased: new Decimal(500),
        lifetime_spent: new Decimal(250),
        unlimited_credits: false,
        daily_limit: new Decimal(100),
        auto_recharge_enabled: true
      };

      mockCreditDAO.getCreditAccount = jest.fn().mockResolvedValue(mockAccount);
      
      // Mock daily usage query
      mockDB.query.mockResolvedValueOnce([{ daily_spent: 25 }]);

      const result = await creditGatewayService.getBalance(userId, context);

      expect(result.currentBalance).toEqual(new Decimal(250));
      expect(result.availableBalance).toEqual(new Decimal(250)); // No reserved
      expect(result.lifetimePurchased).toEqual(new Decimal(500));
      expect(result.lifetimeSpent).toEqual(new Decimal(250));
      expect(result.dailyLimit).toEqual(new Decimal(100));
      expect(result.dailyUsed).toEqual(new Decimal(25));
      expect(result.autoRechargeEnabled).toBe(true);
      expect(result.unlimitedCredits).toBe(false);
    });

    test('should throw error when account not found', async () => {
      const userId = 'nonexistent-user';
      const context = { userId, isAdmin: false };

      mockCreditDAO.getCreditAccount = jest.fn().mockResolvedValue(null);

      await expect(
        creditGatewayService.getBalance(userId, context)
      ).rejects.toThrow('Credit account not found');
    });
  });

  describe('addCredits', () => {
    test('should add credits to user account', async () => {
      const userId = 'test-user-123';
      const amount = new Decimal(100);
      const description = 'Credit purchase - $100';
      const paymentReference = 'payment_12345';
      const context = { userId, isAdmin: false };

      const mockTransaction = {
        id: 'txn-purchase-456',
        user_id: userId,
        amount,
        transaction_type: 'purchase',
        balance_after: new Decimal(350),
        description,
        created_at: new Date()
      };

      mockCreditDAO.addCredits = jest.fn().mockResolvedValue(mockTransaction);

      const result = await creditGatewayService.addCredits(
        userId,
        amount,
        description,
        paymentReference,
        context
      );

      expect(result).toEqual(mockTransaction);
      expect(mockCreditDAO.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount,
          description,
          paymentReference,
          metadata: expect.objectContaining({
            paymentReference,
            source: 'api_gateway'
          })
        }),
        context
      );
    });
  });

  describe('getTransactionHistory', () => {
    test('should return paginated transaction history with summary', async () => {
      const userId = 'test-user-123';
      const context = { userId, isAdmin: false };
      const options = { limit: 10, offset: 0 };

      const mockTransactions = [
        {
          id: 'txn-1',
          amount: new Decimal(100),
          transaction_type: 'purchase',
          is_admin_bypass: false,
          created_at: new Date()
        },
        {
          id: 'txn-2',
          amount: new Decimal(-25),
          transaction_type: 'usage',
          is_admin_bypass: false,
          created_at: new Date()
        }
      ];

      const mockResult = {
        transactions: mockTransactions,
        total: 15
      };

      mockCreditDAO.getTransactionHistory = jest.fn().mockResolvedValue(mockResult);

      const result = await creditGatewayService.getTransactionHistory(
        userId,
        options,
        context
      );

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.total).toBe(15);
      expect(result.summary.totalSpent).toEqual(new Decimal(25));
      expect(result.summary.totalPurchased).toEqual(new Decimal(100));
      expect(result.summary.adminBypasses).toBe(0);
    });
  });

  describe('getAdminAnalytics', () => {
    test('should return admin analytics for authorized admin users', async () => {
      const adminUserId = 'admin-123';
      const context = { userId: adminUserId, isAdmin: true };
      const timeRange = 'day' as const;

      // Mock admin check
      mockDB.query.mockResolvedValueOnce([{
        is_admin: true,
        admin_privileges: { view_all_analytics: true }
      }]);

      const mockAnalytics = {
        totalRevenue: new Decimal(5000),
        totalClaudeCosts: new Decimal(1000),
        totalAdminBypass: new Decimal(500),
        transactionCount: 150,
        topUsers: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
        avgMarkup: new Decimal(33.33)
      };

      mockCreditDAO.getAdminAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      const result = await creditGatewayService.getAdminAnalytics(
        adminUserId,
        timeRange,
        context
      );

      expect(result.revenue.totalRevenue).toEqual(new Decimal(5000));
      expect(result.revenue.totalClaudeCosts).toEqual(new Decimal(1000));
      expect(result.revenue.markupRevenue).toEqual(new Decimal(4000));
      expect(result.usage.totalTransactions).toBe(150);
      expect(result.usage.activeUsers).toBe(2);
      expect(result.system.markupMultiplier).toBe(5.0);
      expect(result.system.noPackages).toBe(true);
    });

    test('should reject non-admin users', async () => {
      const regularUserId = 'regular-123';
      const context = { userId: regularUserId, isAdmin: false };

      // Mock non-admin check
      mockDB.query.mockResolvedValueOnce([{
        is_admin: false,
        admin_privileges: {}
      }]);

      await expect(
        creditGatewayService.getAdminAnalytics(regularUserId, 'day', context)
      ).rejects.toThrow('Admin privileges required for analytics access');
    });
  });

  describe('vision complexity analysis', () => {
    test('should correctly analyze vision complexity levels', async () => {
      const userId = 'test-user';
      const context = { userId, isAdmin: false };

      // Mock non-admin user and sufficient balance
      mockDB.query.mockResolvedValueOnce([{ is_admin: false }]);
      
      const mockAccount = {
        current_balance: new Decimal(1000),
        reserved_balance: new Decimal(0),
        unlimited_credits: false,
        daily_limit: null,
        auto_recharge_enabled: false
      };
      
      mockCreditDAO.getCreditAccount = jest.fn().mockResolvedValue(mockAccount);
      mockDB.query.mockResolvedValueOnce([{ daily_spent: 0 }]);

      const testCases = [
        {
          vision: 'Simple task',
          expectedComplexity: 'low',
          expectedMinCost: 0.1
        },
        {
          vision: 'Create a React component with TypeScript and testing',
          expectedComplexity: 'medium', 
          expectedMinCost: 1.0
        },
        {
          vision: 'Build a comprehensive microservices architecture with PostgreSQL database, JWT authentication, Redis caching, Docker deployment, extensive testing with Jest and Cypress, performance optimization, and scalable API design',
          expectedComplexity: 'very_high',
          expectedMinCost: 5.0
        }
      ];

      for (const testCase of testCases) {
        const request = {
          vision: testCase.vision,
          options: {
            maxIterations: 50,
            enableWebSearch: true,
            enableStreaming: true,
            showProgress: true,
            startingPhase: 'EXPLORE' as const
          }
        };

        const result = await creditGatewayService.validateAndReserveCredits(
          userId,
          request,
          context
        );

        expect(result.estimatedCost).toBeGreaterThan(testCase.expectedMinCost);
      }
    });
  });
});
