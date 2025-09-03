/**
 * keen API Gateway - Agent Execution Routes with Cost Tracking
 * Agent execution with request sanitization, admin bypass, and comprehensive cost monitoring
 */

import { Router, Request, Response } from "express";
import { body, query, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import {
  asyncHandler,
  createValidationError,
} from "../middleware/errorHandler.js";
import { requireScopes } from "../middleware/authentication.js";
import {
  AuthenticatedRequest,
  AgentExecutionRequest,
  PureAgentRequest,
} from "../types.js";
import { CreditGatewayService } from "../services/CreditGatewayService.js";
import { AuditLogger } from "../services/AuditLogger.js";
import { AuthenticationService } from "../services/AuthenticationService.js";
import { keen } from "../../index.js";
import { KeenAgent } from "../../agent/KeenAgent.js";
import { CLIOptions } from "../../cli/types.js";
import fs from "fs/promises";
import path from "path";
import Decimal from "decimal.js";
import chalk from "chalk";

/**
 * Create agents router with service dependencies and cost tracking
 */
export function createAgentsRouter(
  authService: AuthenticationService,
  auditLogger: AuditLogger,
  authMiddleware: any
) {
  const router = Router();
  const keenDB = keen.getInstance();
  const creditGateway = new CreditGatewayService(
    keenDB.credits,
    keenDB.users,
    keenDB.getDatabaseManager()
  );

  // Apply authentication to all agent routes
  router.use(authMiddleware);

  /**
   * Execute agent with vision-driven task completion and comprehensive cost tracking
   */
  router.post(
    "/execute",
    requireScopes(["agents:execute"]),
    [
      body("vision").isLength({ min: 10, max: 10000 }).trim(),
      body("working_directory").optional().isLength({ max: 500 }).trim(),
      body("options").optional().isObject(),
      body("options.max_iterations").optional().isInt({ min: 1, max: 200 }),
      body("options.cost_budget").optional().isFloat({ min: 1, max: 1000 }),
      body("options.enable_web_search").optional().isBoolean(),
      body("options.enable_streaming").optional().isBoolean(),
      body("options.show_progress").optional().isBoolean(),
      body("webhook_url").optional().isURL(),
    ],
    asyncHandler(async (req: any, res: Response) => {
      const requestId = req.id!;
      const startTime = Date.now();

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createValidationError("Invalid agent execution request", {
          validation_errors: errors.array(),
        });
      }

      const user = req.user!;
      const { vision, working_directory, options = {}, webhook_url } = req.body;

      try {
        // Check concurrent sessions (admin bypass)
        if (!user.is_admin) {
          const activeSessions = await getActiveSessionsCount(user.id);
          if (activeSessions >= 3) {
            return res.status(409).json({
              success: false,
              error: {
                type: "CONCURRENCY_ERROR",
                code: "TOO_MANY_CONCURRENT_SESSIONS",
                message: "Maximum concurrent sessions exceeded",
                details: {
                  current: activeSessions,
                  limit: 3,
                  admin_bypass_available: false,
                },
              },
              request_id: requestId,
            });
          }
        }

        // 1. Prepare agent execution request
        const agentRequest: AgentExecutionRequest = {
          vision,
          workingDirectory: working_directory,
          options: {
            maxIterations: options.max_iterations || 50,
            costBudget: options.cost_budget || 100,
            enableWebSearch: options.enable_web_search !== false,
            enableStreaming: options.enable_streaming !== false,
            showProgress: options.show_progress !== false,
            startingPhase: options.starting_phase || "EXPLORE",
          },
          webhookUrl: webhook_url,
        };

        // 2. Credit validation and reservation (admin bypass)
        const creditReservation = await creditGateway.validateAndReserveCredits(
          user.id,
          agentRequest,
          {
            userId: user.id,
            isAdmin: user.is_admin,
            adminPrivileges: user.admin_privileges,
          }
        );

        // 3. Create isolated workspace
        const workspace = await createUserWorkspace(user.id, {
          sessionType: "agent_execution",
          visionHash: hashString(agentRequest.vision),
          isAdminSession: user.is_admin,
        });

        // 4. Store session in database first
        const agentSession = await keenDB.sessions.createSession(
          user.id,
          {
            sessionId: workspace.sessionId,
            gitBranch: "main",
            vision: agentRequest.vision,
            workingDirectory: workspace.path,
            agentOptions: {
              maxIterations: agentRequest.options.maxIterations!,
              enableWebSearch: agentRequest.options.enableWebSearch!,
              enableStreaming: agentRequest.options.enableStreaming!,
              showProgress: agentRequest.options.showProgress!,
            },
          },
          {
            userId: user.id,
            isAdmin: user.is_admin,
            adminPrivileges: user.admin_privileges,
          }
        );

        // 5. Start agent execution tracking (internal)
        await incrementActiveSession(user.id, workspace.sessionId);

        // 6. Return immediate response with cost tracking info
        const immediateResponse = {
          success: true,
          message:
            "Agent execution started successfully with cost tracking enabled",
          session: {
            id: agentSession.id,
            session_id: workspace.sessionId,
            status: "running" as const,
            current_phase: "EXPLORE" as const,
            vision: agentRequest.vision,
            working_directory: workspace.path,
            git_branch: "main",
            estimated_cost: creditReservation.estimatedCost,
            streaming_url: `wss://ws.keen.dev/sessions/${workspace.sessionId}`,
            created_at: new Date().toISOString(),
            cost_tracking: {
              enabled: true,
              initial_budget: agentRequest.options.costBudget!,
              estimated_cost: creditReservation.estimatedCost,
              real_time_monitoring: true,
            },
          },
          credit_info: {
            reserved: creditReservation.reservedAmount,
            estimated_cost: creditReservation.estimatedCost,
            claude_cost: creditReservation.claudeCost,
            markup_multiplier: creditReservation.markupMultiplier,
            is_admin_session: creditReservation.isAdmin || false,
            credit_bypass: creditReservation.unlimited || false,
            remaining_balance: creditReservation.remainingBalance,
          },
          execution_info: {
            agent_purity: true,
            business_logic_isolated: true,
            cost_tracking_enabled: true,
            real_time_cost_monitoring: true,
            sanitized_request: {
              vision_length: agentRequest.vision.length,
              working_directory: workspace.path,
              max_iterations: agentRequest.options.maxIterations!,
              features_enabled: {
                web_search: agentRequest.options.enableWebSearch!,
                streaming: agentRequest.options.enableStreaming!,
                progress_display: agentRequest.options.showProgress!,
                cost_tracking: true,
              },
            },
          },
          request_id: requestId,
        };

        // Send immediate response
        res.status(200).json(immediateResponse);

        // 7. Execute agent asynchronously with enhanced cost tracking
        setImmediate(async () => {
          try {
            console.log(
              chalk.green(
                `💰 Starting agent execution with cost tracking for session ${workspace.sessionId}`
              )
            );

            // Prepare SANITIZED agent request (NO BUSINESS LOGIC!)
            const sanitizedOptions: CLIOptions = {
              vision: agentRequest.vision,
              directory: workspace.path,
              phase: "EXPLORE",
              maxIterations: agentRequest.options.maxIterations!,
              costBudget: agentRequest.options.costBudget!,
              webSearch: agentRequest.options.enableWebSearch!,
              extendedContext: true,
              stream: agentRequest.options.enableStreaming!,
              verbose: false,
              debug: false,
              dryRun: false,
              // Pass user context for cost tracking and database integration
              userContext: {
                userId: user.id,
                isAdmin: user.is_admin,
                adminPrivileges: user.admin_privileges,
              },
            };

            // Execute the agent with cost tracking
            const agent = new KeenAgent(sanitizedOptions);
            const result = await agent.execute();

            // Get final cost information from the agent
            const finalCostBreakdown = agent.getSessionCosts();
            console.log(
              chalk.green(
                `💰 Agent execution completed. Final cost: $${finalCostBreakdown.totalCost.toFixed(4)}`
              )
            );

            // Update session with results including detailed cost information
            await keenDB.sessions.updateSession(
              agentSession.id,
              {
                executionStatus: result.success ? "completed" : "failed",
                totalCost: finalCostBreakdown.totalCost,
                completionReport: {
                  success: result.success,
                  summary: result.summary,
                  filesCreated: result.filesCreated,
                  filesModified: result.filesModified,
                  nextSteps: result.nextSteps,
                  testsRun: result.testsRun,
                  validationResults: result.validationResults,
                  duration: result.duration,
                  totalCost: finalCostBreakdown.totalCost,
                  costBreakdown: finalCostBreakdown,
                  error: result.error,
                  completed_at: new Date().toISOString(),
                  cost_analysis: {
                    total_api_calls: finalCostBreakdown.totalCalls,
                    average_cost_per_call:
                      finalCostBreakdown.averageCostPerCall,
                    extended_pricing_calls:
                      finalCostBreakdown.extendedPricingCalls,
                    cost_by_phase: finalCostBreakdown.costByPhase,
                    tokens_breakdown: {
                      input: finalCostBreakdown.inputTokens,
                      output: finalCostBreakdown.outputTokens,
                      thinking: finalCostBreakdown.thinkingTokens,
                      total: finalCostBreakdown.totalTokens,
                    },
                  },
                },
              },
              {
                userId: user.id,
                isAdmin: user.is_admin,
                adminPrivileges: user.admin_privileges,
              }
            );

            // Handle credit finalization with actual costs (admin bypass)
            if (finalCostBreakdown.totalCost > 0) {
              try {
                // Convert keen total cost back to Claude API cost (divide by 5x markup)
                const actualClaudeCost = finalCostBreakdown.totalCost / 5;

                await creditGateway.finalizeCredits(
                  user.id,
                  creditReservation.reservationId,
                  new Decimal(actualClaudeCost),
                  workspace.sessionId,
                  {
                    userId: user.id,
                    isAdmin: user.is_admin,
                    adminPrivileges: user.admin_privileges,
                  }
                );

                console.log(
                  chalk.green(
                    `💰 Credits finalized: $${finalCostBreakdown.totalCost.toFixed(4)} (Claude: $${actualClaudeCost.toFixed(4)})`
                  )
                );
              } catch (creditError) {
                console.error(
                  `❌ Failed to finalize credits for session ${workspace.sessionId}:`,
                  creditError
                );
              }
            }

            // Remove from active sessions
            await decrementActiveSession(user.id, workspace.sessionId);

            console.log(
              chalk.green(
                `✅ Agent session ${workspace.sessionId} completed successfully with total cost: $${finalCostBreakdown.totalCost.toFixed(4)}`
              )
            );
          } catch (agentError: any) {
            console.error(
              `❌ Agent session ${workspace.sessionId} failed:`,
              agentError.message
            );

            // Update session with error and any partial cost information
            let partialCost = 0;
            try {
              const agent = new KeenAgent({
                vision: agentRequest.vision,
                directory: workspace.path,
                userContext: {
                  userId: user.id,
                  isAdmin: user.is_admin,
                  adminPrivileges: user.admin_privileges,
                },
              } as CLIOptions);
              const partialCostBreakdown = agent.getSessionCosts();
              partialCost = partialCostBreakdown?.totalCost || 0;
            } catch (costError) {
              console.warn("Could not retrieve partial cost information");
            }

            await keenDB.sessions.updateSession(
              agentSession.id,
              {
                executionStatus: "failed",
                totalCost: partialCost,
                completionReport: {
                  success: false,
                  error: agentError.message,
                  failed_at: new Date().toISOString(),
                  partial_cost: partialCost,
                },
              },
              {
                userId: user.id,
                isAdmin: user.is_admin,
                adminPrivileges: user.admin_privileges,
              }
            );

            // Remove from active sessions
            await decrementActiveSession(user.id, workspace.sessionId);

            console.log(
              chalk.red(
                `💰 Failed session had partial cost: $${partialCost.toFixed(4)}`
              )
            );
          }
        });

        // 8. Audit log (async) with cost tracking info
        setImmediate(async () => {
          await auditLogger.logAgentExecution({
            userId: user.id,
            sessionId: workspace.sessionId,
            requestId,
            vision: agentRequest.vision.substring(0, 200),
            estimatedCost: creditReservation.estimatedCost,
            isAdminSession: user.is_admin,
            creditBypass: creditReservation.unlimited || false,
            costTrackingEnabled: true,
          });
        });

        return;
      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Handle insufficient credits error
        if (error.name === "InsufficientCreditsError") {
          return res.status(402).json({
            success: false,
            error: {
              type: "INSUFFICIENT_CREDITS",
              code: "PAYMENT_REQUIRED",
              message: "Insufficient credits for this operation",
              details: {
                required: error.required,
                available: error.available,
                shortfall: error.shortfall,
                claude_cost: error.claudeCost,
                markup_multiplier: error.markupMultiplier,
                credit_info: {
                  pricing: "5x markup over Claude API costs",
                  no_packages: true,
                  individual_tier: true,
                  purchase_url: "https://app.keen.dev/credits/purchase",
                },
              },
              help_url: "https://docs.keen.dev/credits/insufficient",
            },
            request_id: requestId,
          });
        }

        // Log error
        await auditLogger.logError({
          requestId,
          userId: user.id,
          error: error.message,
          duration,
          isAdmin: user.is_admin,
        });

        throw error;
      }
    })
  );

  /**
   * Get session status with detailed cost information
   */
  router.get(
    "/sessions/:sessionId",
    requireScopes(["sessions:read"]),
    asyncHandler(async (req: any, res: Response) => {
      const user = req.user!;
      const sessionId = req.params.sessionId;

      // Get session from database
      const session = await getSessionByCustomId(sessionId, {
        userId: user.id,
        isAdmin: user.is_admin,
        adminPrivileges: user.admin_privileges,
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: {
            type: "NOT_FOUND",
            code: "SESSION_NOT_FOUND",
            message: "Agent session not found",
            help_url: "https://docs.keen.dev/api/sessions",
          },
          request_id: req.id,
        });
      }

      // Check ownership (unless admin)
      if (!user.is_admin && session.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            type: "AUTHORIZATION_ERROR",
            code: "SESSION_ACCESS_DENIED",
            message: "You do not have access to this session",
          },
          request_id: req.id,
        });
      }

      // Extract cost information from completion report
      const completionReport = session.completion_report || {};
      const costBreakdown = completionReport.costBreakdown || {};
      const costAnalysis = completionReport.cost_analysis || {};

      // Return session status with comprehensive cost information
      const sessionStatus = {
        id: session.id,
        session_id: session.session_id,
        status: session.execution_status || "running",
        current_phase: "EXPLORE", // TODO: Get from session data
        phase_started_at: session.created_at,
        progress: {
          phase_progress: session.execution_status === "completed" ? 1.0 : 0.35,
          overall_progress:
            session.execution_status === "completed" ? 1.0 : 0.15,
          current_action:
            session.execution_status === "completed"
              ? "Completed"
              : "Processing...",
          agents_spawned: 1,
          files_examined: 12,
        },
        metrics: {
          iteration_count: 8,
          tool_calls_count: 23,
          total_cost: session.total_cost || 0,
          tokens_used: costAnalysis.tokens_breakdown?.total || 87000,
          files_created: completionReport.filesCreated || [],
          files_modified: completionReport.filesModified || [],
        },
        // NEW: Detailed cost information
        cost_tracking: {
          total_cost: session.total_cost || 0,
          cost_breakdown: {
            total_api_calls: costAnalysis.total_api_calls || 0,
            average_cost_per_call: costAnalysis.average_cost_per_call || 0,
            extended_pricing_calls: costAnalysis.extended_pricing_calls || 0,
            cost_by_phase: costAnalysis.cost_by_phase || {},
            tokens_breakdown: costAnalysis.tokens_breakdown || {
              input: 0,
              output: 0,
              thinking: 0,
              total: 0,
            },
          },
          cost_efficiency: {
            cost_per_iteration:
              session.total_cost && costAnalysis.total_api_calls
                ? (session.total_cost / costAnalysis.total_api_calls).toFixed(4)
                : "0.0000",
            tokens_per_dollar:
              session.total_cost && costAnalysis.tokens_breakdown?.total
                ? Math.round(
                    costAnalysis.tokens_breakdown.total / session.total_cost
                  )
                : 0,
            pricing_tier:
              costAnalysis.extended_pricing_calls > 0
                ? "Extended (>200K tokens)"
                : "Standard",
          },
          real_time_monitoring: true,
        },
        git_operations: [
          {
            type: "init",
            branch: "main",
            timestamp: session.created_at,
            message: "Initialize repository",
          },
        ],
        completion_report: completionReport,
        created_at: session.created_at,
        updated_at: session.updated_at,
      };

      return res.status(200).json({
        success: true,
        session: sessionStatus,
        admin_info: user.is_admin
          ? {
              user_id: session.user_id,
              cost_tracking: {
                admin_bypass: user.is_admin,
                actual_charges: user.is_admin ? 0 : session.total_cost || 0,
                theoretical_cost: session.total_cost || 0,
                credit_system_markup: "5x Claude API costs",
              },
            }
          : undefined,
      });
    })
  );

  /**
   * NEW: Get detailed cost breakdown for a session
   */
  router.get(
    "/sessions/:sessionId/costs",
    requireScopes(["sessions:read"]),
    asyncHandler(async (req: any, res: Response) => {
      const user = req.user!;
      const sessionId = req.params.sessionId;

      // Get session from database
      const session = await getSessionByCustomId(sessionId, {
        userId: user.id,
        isAdmin: user.is_admin,
        adminPrivileges: user.admin_privileges,
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: {
            type: "NOT_FOUND",
            code: "SESSION_NOT_FOUND",
            message: "Agent session not found",
          },
          request_id: req.id,
        });
      }

      // Check ownership (unless admin)
      if (!user.is_admin && session.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            type: "AUTHORIZATION_ERROR",
            code: "SESSION_ACCESS_DENIED",
            message: "You do not have access to this session",
          },
          request_id: req.id,
        });
      }

      // Extract detailed cost information
      const completionReport = session.completion_report || {};
      const costBreakdown = completionReport.costBreakdown || {};
      const costAnalysis = completionReport.cost_analysis || {};

      return res.status(200).json({
        success: true,
        session_id: sessionId,
        cost_details: {
          total_cost: session.total_cost || 0,
          api_calls: costAnalysis.total_api_calls || 0,
          average_cost_per_call: costAnalysis.average_cost_per_call || 0,
          tokens: {
            input: costAnalysis.tokens_breakdown?.input || 0,
            output: costAnalysis.tokens_breakdown?.output || 0,
            thinking: costAnalysis.tokens_breakdown?.thinking || 0,
            total: costAnalysis.tokens_breakdown?.total || 0,
          },
          pricing_analysis: {
            extended_pricing_calls: costAnalysis.extended_pricing_calls || 0,
            standard_pricing_calls:
              (costAnalysis.total_api_calls || 0) -
              (costAnalysis.extended_pricing_calls || 0),
            pricing_efficiency:
              costAnalysis.extended_pricing_calls > 0
                ? "Mixed pricing tiers used"
                : "Standard pricing only",
          },
          cost_by_phase: costAnalysis.cost_by_phase || {},
          session_efficiency: {
            cost_per_iteration:
              session.total_cost && costAnalysis.total_api_calls
                ? (session.total_cost / costAnalysis.total_api_calls).toFixed(6)
                : "0.000000",
            tokens_per_dollar:
              session.total_cost && costAnalysis.tokens_breakdown?.total
                ? Math.round(
                    costAnalysis.tokens_breakdown.total / session.total_cost
                  )
                : 0,
          },
        },
        credit_system_info: {
          markup_multiplier: "5x Claude API costs",
          admin_bypass: user.is_admin,
          actual_charge: user.is_admin ? 0 : session.total_cost || 0,
        },
        timestamp: new Date().toISOString(),
      });
    })
  );

  /**
   * Cancel session with cost information
   */
  router.post(
    "/sessions/:sessionId/cancel",
    requireScopes(["agents:execute"]),
    [body("reason").optional().isLength({ max: 500 }).trim()],
    asyncHandler(async (req: any, res: Response) => {
      const user = req.user!;
      const sessionId = req.params.sessionId;
      const reason = req.body.reason || "User requested cancellation";

      // Get session to verify ownership
      const session = await getSessionByCustomId(sessionId, {
        userId: user.id,
        isAdmin: user.is_admin,
        adminPrivileges: user.admin_privileges,
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: {
            type: "NOT_FOUND",
            code: "SESSION_NOT_FOUND",
            message: "Agent session not found",
          },
          request_id: req.id,
        });
      }

      // Check ownership (unless admin)
      if (!user.is_admin && session.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            type: "AUTHORIZATION_ERROR",
            code: "SESSION_ACCESS_DENIED",
            message: "You do not have access to this session",
          },
          request_id: req.id,
        });
      }

      // Get current cost before cancellation
      const currentCost = session.total_cost || 0;

      // Update session with cancellation and preserve cost information
      await keenDB.sessions.updateSession(
        session.id,
        {
          executionStatus: "cancelled",
          totalCost: currentCost,
          completionReport: {
            cancellation_reason: reason,
            cancelled_by: user.id,
            cancelled_at: new Date().toISOString(),
            partial_cost: currentCost,
            cost_at_cancellation: currentCost,
          },
        },
        {
          userId: user.id,
          isAdmin: user.is_admin,
          adminPrivileges: user.admin_privileges,
        }
      );

      // Remove from concurrent session tracking
      await decrementActiveSession(user.id, sessionId);

      // Log cancellation with cost information
      await auditLogger.logAdminAction({
        adminUserId: user.id,
        action: "cancel_session",
        details: {
          session_id: sessionId,
          reason,
          cost_at_cancellation: currentCost,
        },
      });

      console.log(
        chalk.yellow(
          `🛑 Session ${sessionId} cancelled by user. Cost at cancellation: $${currentCost.toFixed(4)}`
        )
      );

      return res.status(200).json({
        success: true,
        message: "Agent session cancelled successfully",
        session: {
          id: session.id,
          session_id: sessionId,
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          cost_at_cancellation: currentCost,
        },
        cost_info: {
          total_cost: currentCost,
          refund_eligible: currentCost > 0,
          note: "Partial costs may have been incurred before cancellation",
        },
      });
    })
  );

  /**
   * List user sessions with cost information
   */
  router.get(
    "/sessions",
    requireScopes(["sessions:read"]),
    [
      query("status")
        .optional()
        .isIn(["running", "completed", "failed", "cancelled"]),
      query("limit").optional().isInt({ min: 1, max: 100 }),
      query("offset").optional().isInt({ min: 0 }),
    ],
    asyncHandler(async (req: any, res: Response) => {
      const user = req.user!;
      const { status, limit = 20, offset = 0 } = req.query;

      // Query actual sessions from database with cost information
      let query = "SELECT * FROM agent_sessions WHERE user_id = $1";
      const params: any[] = [user.id];

      if (status) {
        query += " AND execution_status = $2";
        params.push(status);
      }

      query +=
        " ORDER BY created_at DESC LIMIT $" +
        (params.length + 1) +
        " OFFSET $" +
        (params.length + 2);
      params.push(Number(limit), Number(offset));

      const sessions = await keenDB.getDatabaseManager().query(query, params, {
        userId: user.id,
        isAdmin: user.is_admin,
        adminPrivileges: user.admin_privileges,
      });

      // Transform sessions for API response with cost information
      const sessionsList = sessions.map((session: any) => ({
        id: session.session_id,
        session_id: session.session_id,
        status: session.execution_status || "running",
        current_phase: "EXPLORE", // TODO: Get from session data
        vision:
          session.vision.substring(0, 100) +
          (session.vision.length > 100 ? "..." : ""),
        total_cost: session.total_cost || 0,
        cost_summary: {
          total_cost: session.total_cost || 0,
          status: session.execution_status || "running",
          cost_efficiency:
            session.total_cost > 0 ? "Cost tracked" : "No cost yet",
        },
        created_at: session.created_at,
        last_activity_at: session.updated_at || session.created_at,
      }));

      // Calculate summary statistics
      const totalCost = sessionsList.reduce(
        (sum: number, session: any) => sum + session.total_cost,
        0
      );
      const completedSessions = sessionsList.filter(
        (session: any) => session.status === "completed"
      ).length;
      const averageCost =
        completedSessions > 0 ? totalCost / completedSessions : 0;

      return res.status(200).json({
        success: true,
        sessions: sessionsList,
        pagination: {
          total: sessionsList.length, // TODO: Get actual count
          limit: Number(limit),
          offset: Number(offset),
          has_more: sessionsList.length === Number(limit),
        },
        cost_summary: {
          total_cost_all_sessions: totalCost,
          completed_sessions: completedSessions,
          average_cost_per_session: averageCost.toFixed(4),
          cost_tracking_enabled: true,
        },
        filters: {
          status: status || "all",
        },
      });
    })
  );

  return router;
}

// Helper functions

/**
 * Create isolated user workspace
 */
async function createUserWorkspace(
  userId: string,
  config: {
    sessionType: "agent_execution" | "user_workspace";
    visionHash: string;
    isAdminSession: boolean;
  }
): Promise<{ sessionId: string; path: string }> {
  const sessionId = uuidv4();
  const workspacePath = path.join(process.cwd(), "workspaces", sessionId);

  try {
    await fs.mkdir(workspacePath, { recursive: true });
    console.log(`✅ Created workspace: ${workspacePath}`);
  } catch (error) {
    console.warn(`Failed to create workspace directory: ${error}`);
  }

  return {
    sessionId,
    path: workspacePath,
  };
}

/**
 * Get session by session_id field instead of id field
 */
async function getSessionByCustomId(
  sessionId: string,
  context: {
    userId: string;
    isAdmin: boolean;
    adminPrivileges?: any;
  }
): Promise<any> {
  const keenDB = keen.getInstance();

  const result = await keenDB
    .getDatabaseManager()
    .query("SELECT * FROM agent_sessions WHERE session_id = $1", [sessionId], {
      userId: context.userId,
      isAdmin: context.isAdmin,
      adminPrivileges: context.adminPrivileges,
    });

  return result[0] || null;
}

/**
 * Hash string for consistent identification
 */
function hashString(input: string): string {
  const crypto = require("crypto");
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("hex")
    .substring(0, 16);
}

// In-memory session tracking (TODO: move to Redis)
const activeSessions = new Map<string, Set<string>>();

async function getActiveSessionsCount(userId: string): Promise<number> {
  const sessions = activeSessions.get(userId);
  return sessions ? sessions.size : 0;
}

async function incrementActiveSession(
  userId: string,
  sessionId: string
): Promise<void> {
  if (!activeSessions.has(userId)) {
    activeSessions.set(userId, new Set());
  }
  activeSessions.get(userId)!.add(sessionId);
}

async function decrementActiveSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const sessions = activeSessions.get(userId);
  if (sessions) {
    sessions.delete(sessionId);
    if (sessions.size === 0) {
      activeSessions.delete(userId);
    }
  }
}

// Export for backwards compatibility
export { createAgentsRouter as agentsRouter };
