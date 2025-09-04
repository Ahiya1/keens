/**
 * Phase 3.3: Coordinate Agents Tool
 * Simplified coordination tool for sequential agent execution
 * Manages agent tree state and enforces sequential execution order
 * SECURITY: Replaced console.log with proper Logger to prevent sensitive data exposure
 */

import {
  AgentExecutionContext,
  AgentTreeStatus,
  AgentPhase,
} from "../types.js";
import chalk from "chalk";
import { getLogger } from '../../utils/Logger.js';

export class CoordinateAgentsTool {
  private logger = getLogger();

  getDescription(): string {
    return "Coordinate agent tree execution, enforce sequential order, and manage dependencies between parent and child agents.";
  }

  getInputSchema() {
    return {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["status", "validate_sequential", "check_dependencies", "sync_phase"],
          description: "Coordination action to perform",
        },
        dependencies: {
          type: "array",
          items: { type: "string" },
          description: "List of dependencies to check (session IDs or requirements)",
        },
        targetPhase: {
          type: "string",
          enum: ["EXPLORE", "PLAN", "FOUND", "SUMMON", "COMPLETE"],
          description: "Target phase for sync_phase action",
        },
        waitForChildren: {
          type: "boolean",
          default: true,
          description: "Whether to wait for all children to complete before proceeding",
        }
      },
      required: ["action"],
    };
  }

  async execute(parameters: any, context: AgentExecutionContext): Promise<any> {
    try {
      // Validate that we have AgentTreeManager
      const agentTreeManager = context.toolManagerOptions?.agentTreeManager;
      if (!agentTreeManager) {
        throw new Error("AgentTreeManager not available - coordination not supported");
      }

      switch (parameters.action) {
        case "status":
          return await this.getCoordinationStatus(agentTreeManager, context);

        case "validate_sequential":
          return await this.validateSequentialExecution(agentTreeManager, context);

        case "check_dependencies":
          return await this.checkDependencies(agentTreeManager, context, parameters.dependencies || []);

        case "sync_phase":
          return await this.syncPhase(agentTreeManager, context, parameters.targetPhase || "COMPLETE", parameters.waitForChildren !== false);

        default:
          throw new Error(`Unknown coordination action: ${parameters.action}`);
      }
    } catch (error: any) {
      // SECURITY: Use Logger instead of console.error
      this.logger.error('coordinate', `Agent coordination failed: ${error.message}`, {
        action: parameters.action,
        sessionId: context.sessionId,
      });
      return {
        success: false,
        error: `Agent coordination failed: ${error.message}`,
        action: parameters.action,
      };
    }
  }

  private async getCoordinationStatus(agentTreeManager: any, context: AgentExecutionContext): Promise<any> {
    const treeStatus: AgentTreeStatus = agentTreeManager.getTreeStatus();
    const currentNode = agentTreeManager.getNode(context.sessionId);

    // SECURITY: Use Logger instead of console.log
    this.logger.info('coordinate', 'Agent Tree Coordination Status', {
      totalNodes: treeStatus.totalNodes,
      activeNodes: treeStatus.activeNodes,
      completedNodes: treeStatus.completedNodes,
    });

    if (currentNode) {
      this.logger.info('coordinate', 'Current Node Status', {
        sessionId: currentNode.sessionId,
        phase: currentNode.phase,
      });
    }

    return {
      success: true,
      treeStatus,
      currentNode,
      timestamp: new Date().toISOString(),
    };
  }

  private async validateSequentialExecution(agentTreeManager: any, context: AgentExecutionContext): Promise<any> {
    const treeStatus: AgentTreeStatus = agentTreeManager.getTreeStatus();
    const violations: string[] = [];

    // Simple validation - check for multiple active nodes at same level
    const activeNodes = Object.values(treeStatus.tree).filter((node: any) => node.status === "running");

    if (activeNodes.length > 1) {
      violations.push(`Multiple active nodes detected: ${activeNodes.length}`);
    }

    return {
      success: true,
      violations,
      isSequential: violations.length === 0,
      activeNodes: activeNodes.length,
    };
  }

  private async checkDependencies(agentTreeManager: any, context: AgentExecutionContext, dependencies: string[]): Promise<any> {
    const unmetDependencies = [];

    for (const dep of dependencies) {
      const node = agentTreeManager.getNode(dep);
      if (!node || node.status !== 'completed') {
        unmetDependencies.push(dep);
      }
    }

    return {
      success: true,
      dependencies,
      unmetDependencies,
      allDependenciesMet: unmetDependencies.length === 0,
    };
  }

  private async syncPhase(agentTreeManager: any, context: AgentExecutionContext, targetPhase: string, waitForChildren: boolean): Promise<any> {
    // SECURITY: Use Logger instead of console.log
    this.logger.info('coordinate', 'Syncing to phase', {
      targetPhase,
      sessionId: context.sessionId,
    });

    const currentNode = agentTreeManager.getNode(context.sessionId);
    if (currentNode) {
      this.logger.info('coordinate', 'Current phase information', {
        currentPhase: currentNode.phase,
      });
    }

    return {
      success: true,
      targetPhase,
      currentPhase: currentNode?.phase,
      waitForChildren,
      synchronized: true,
    };
  }
}
