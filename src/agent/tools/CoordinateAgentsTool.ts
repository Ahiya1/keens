/**
 * Phase 3.3: Coordinate Agents Tool
 * Simplified coordination tool for sequential agent execution
 * Manages agent tree state and enforces sequential execution order
 */

import {
  AgentExecutionContext,
  AgentTreeStatus,
  AgentPhase,
} from "../types.js";
import chalk from "chalk";

export class CoordinateAgentsTool {
  getDescription(): string {
    return "Coordinate agent tree execution, enforce sequential order, and manage dependencies between parent and child agents.";
  }

  getInputSchema() {
    return {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "status",
            "validate_sequential",
            "check_dependencies",
            "sync_phase",
          ],
          description: "Coordination action to perform",
        },
        targetPhase: {
          type: "string",
          enum: ["EXPLORE", "PLAN", "FOUND", "SUMMON", "COMPLETE"],
          description: "Target phase for sync_phase action",
        },
        dependencies: {
          type: "array",
          items: { type: "string" },
          description:
            "List of dependencies to check (session IDs or requirements)",
        },
        waitForChildren: {
          type: "boolean",
          description:
            "Whether to wait for all children to complete before proceeding",
          default: true,
        },
      },
      required: ["action"],
    };
  }

  async execute(
    parameters: {
      action:
        | "status"
        | "validate_sequential"
        | "check_dependencies"
        | "sync_phase";
      targetPhase?: AgentPhase;
      dependencies?: string[];
      waitForChildren?: boolean;
    },
    context: AgentExecutionContext
  ): Promise<any> {
    try {
      // Validate that we have AgentTreeManager
      const agentTreeManager = context.toolManagerOptions?.agentTreeManager;
      if (!agentTreeManager) {
        throw new Error(
          "AgentTreeManager not available - coordination not supported"
        );
      }

      console.log(chalk.blue(`🤝 Coordinating agents: ${parameters.action}`));

      switch (parameters.action) {
        case "status":
          return await this.getCoordinationStatus(agentTreeManager, context);

        case "validate_sequential":
          return await this.validateSequentialExecution(
            agentTreeManager,
            context
          );

        case "check_dependencies":
          return await this.checkDependencies(
            agentTreeManager,
            context,
            parameters.dependencies || []
          );

        case "sync_phase":
          return await this.syncPhase(
            agentTreeManager,
            context,
            parameters.targetPhase || "COMPLETE",
            parameters.waitForChildren !== false
          );

        default:
          throw new Error(`Unknown coordination action: ${parameters.action}`);
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Coordination failed: ${error.message}`));

      return {
        success: false,
        error: `Agent coordination failed: ${error.message}`,
        action: parameters.action,
      };
    }
  }

  /**
   * Get current coordination status
   */
  private async getCoordinationStatus(
    agentTreeManager: any,
    context: AgentExecutionContext
  ): Promise<any> {
    const treeStatus: AgentTreeStatus = agentTreeManager.getTreeStatus();
    const currentNode = agentTreeManager.getNode(context.sessionId);

    console.log(chalk.green(`🌳 Agent Tree Status:`));
    console.log(chalk.gray(`  Total Nodes: ${treeStatus.totalNodes}`));
    console.log(
      chalk.gray(
        `  Active: ${treeStatus.activeNodes}, Completed: ${treeStatus.completedNodes}, Failed: ${treeStatus.failedNodes}`
      )
    );
    console.log(chalk.gray(`  Max Depth: ${treeStatus.maxDepth}`));

    if (currentNode) {
      console.log(
        chalk.gray(
          `  Current Node: ${currentNode.sessionId} (${currentNode.specialization}) [${currentNode.phase}]`
        )
      );
      console.log(
        chalk.gray(
          `  Depth: ${currentNode.depth}, Children: ${currentNode.children.length}`
        )
      );
    }

    // Check sequential execution compliance
    const sequentialCompliance = this.checkSequentialCompliance(treeStatus);

    return {
      success: true,
      treeStatus,
      currentNode,
      sequentialCompliance,
      canSpawnChild: agentTreeManager.canSpawnChild(context.sessionId),
      executionOrder: treeStatus.executionOrder,
      visualization: agentTreeManager.getTreeVisualization(),
    };
  }

  /**
   * Validate that execution is following sequential order
   */
  private async validateSequentialExecution(
    agentTreeManager: any,
    context: AgentExecutionContext
  ): Promise<any> {
    const treeStatus: AgentTreeStatus = agentTreeManager.getTreeStatus();
    const violations: string[] = [];

    // Check for multiple active children (violates sequential execution)
    Object.values(treeStatus.tree).forEach((node: any) => {
      const activeChildren = node.children.filter((childId: string) => {
        const child = treeStatus.tree[childId];
        return child && child.status === "running";
      });

      if (activeChildren.length > 1) {
        violations.push(
          `Node ${node.sessionId} has ${activeChildren.length} active children (should be max 1 in sequential mode)`
        );
      }
    });

    // Check for out-of-order execution
    const executionOrder = treeStatus.executionOrder;
    for (let i = 1; i < executionOrder.length; i++) {
      const current = treeStatus.tree[executionOrder[i]];
      const previous = treeStatus.tree[executionOrder[i - 1]];

      if (current && previous && current.depth <= previous.depth) {
        // If current depth <= previous depth, previous should be completed
        if (previous.status === "running" && current.status === "running") {
          violations.push(
            `Sequential violation: ${previous.sessionId} and ${current.sessionId} both running at same/higher level`
          );
        }
      }
    }

    const isCompliant = violations.length === 0;

    console.log(
      isCompliant
        ? chalk.green(`✅ Sequential execution is compliant`)
        : chalk.red(
            `❌ ${violations.length} sequential execution violations found`
          )
    );

    violations.forEach((violation) => {
      console.log(chalk.red(`  - ${violation}`));
    });

    return {
      success: true,
      isCompliant,
      violations,
      totalNodes: treeStatus.totalNodes,
      activeNodes: treeStatus.activeNodes,
    };
  }

  /**
   * Check if all dependencies are resolved
   */
  private async checkDependencies(
    agentTreeManager: any,
    context: AgentExecutionContext,
    dependencies: string[]
  ): Promise<any> {
    const treeStatus: AgentTreeStatus = agentTreeManager.getTreeStatus();
    const unresolvedDependencies: string[] = [];
    const resolvedDependencies: string[] = [];

    console.log(
      chalk.blue(`🔍 Checking ${dependencies.length} dependencies...`)
    );

    for (const dependency of dependencies) {
      // Check if dependency is a session ID
      const dependencyNode = treeStatus.tree[dependency];
      if (dependencyNode) {
        if (dependencyNode.status === "completed") {
          resolvedDependencies.push(dependency);
          console.log(chalk.green(`  ✅ ${dependency}: completed`));
        } else {
          unresolvedDependencies.push(dependency);
          console.log(
            chalk.yellow(`  ⏳ ${dependency}: ${dependencyNode.status}`)
          );
        }
      } else {
        // Could be a requirement string - for now, consider unresolved
        unresolvedDependencies.push(dependency);
        console.log(chalk.red(`  ❌ ${dependency}: not found or unresolved`));
      }
    }

    const allResolved = unresolvedDependencies.length === 0;

    return {
      success: true,
      allResolved,
      resolvedDependencies,
      unresolvedDependencies,
      totalDependencies: dependencies.length,
      resolutionRate:
        dependencies.length > 0
          ? resolvedDependencies.length / dependencies.length
          : 1.0,
    };
  }

  /**
   * Sync phase across agent tree
   */
  private async syncPhase(
    agentTreeManager: any,
    context: AgentExecutionContext,
    targetPhase: AgentPhase,
    waitForChildren: boolean
  ): Promise<any> {
    const treeStatus: AgentTreeStatus = agentTreeManager.getTreeStatus();
    const currentNode = agentTreeManager.getNode(context.sessionId);

    if (!currentNode) {
      throw new Error(
        `Current session ${context.sessionId} not found in agent tree`
      );
    }

    console.log(chalk.blue(`🔄 Syncing to phase: ${targetPhase}`));

    // If waiting for children, check that all children are completed
    if (waitForChildren && currentNode.children.length > 0) {
      const activeChildren = currentNode.children.filter(
        (childId: string | number) => {
          const child = treeStatus.tree[childId];
          return child && child.status === "running";
        }
      );

      if (activeChildren.length > 0) {
        console.log(
          chalk.yellow(
            `⏳ Waiting for ${activeChildren.length} active children to complete...`
          )
        );
        activeChildren.forEach((childId: string | number) => {
          const child = treeStatus.tree[childId];
          console.log(
            chalk.gray(
              `  - ${childId} (${child?.specialization}) [${child?.phase}]`
            )
          );
        });

        return {
          success: false,
          error:
            "Cannot sync phase - active children must complete first (sequential execution)",
          waitingFor: activeChildren,
          currentPhase: currentNode.phase,
          targetPhase,
        };
      }
    }

    // Update phase
    agentTreeManager.updatePhase(context.sessionId, targetPhase);

    console.log(
      chalk.green(`✅ Phase synced: ${currentNode.phase} → ${targetPhase}`)
    );

    return {
      success: true,
      previousPhase: currentNode.phase,
      currentPhase: targetPhase,
      sessionId: context.sessionId,
      childrenCompleted: currentNode.children.length,
      treeDepth: currentNode.depth,
    };
  }

  /**
   * Check sequential execution compliance
   */
  private checkSequentialCompliance(treeStatus: AgentTreeStatus): {
    compliant: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Check 1: No node should have multiple active children
    Object.values(treeStatus.tree).forEach((node: any) => {
      totalChecks++;
      const activeChildren = node.children.filter((childId: string) => {
        const child = treeStatus.tree[childId];
        return child && child.status === "running";
      });

      if (activeChildren.length <= 1) {
        passedChecks++;
      } else {
        issues.push(
          `Node ${node.sessionId} has ${activeChildren.length} active children`
        );
      }
    });

    // Check 2: Execution order should follow depth-first pattern
    totalChecks++;
    const orderValid = this.validateExecutionOrder(
      treeStatus.executionOrder,
      treeStatus.tree
    );
    if (orderValid) {
      passedChecks++;
    } else {
      issues.push("Execution order violates sequential depth-first pattern");
    }

    const score = totalChecks > 0 ? passedChecks / totalChecks : 1.0;

    return {
      compliant: issues.length === 0,
      issues,
      score,
    };
  }

  /**
   * Validate execution order follows depth-first sequential pattern
   */
  private validateExecutionOrder(
    executionOrder: string[],
    tree: Record<string, any>
  ): boolean {
    // Simple validation: each node should appear before its children
    for (const sessionId of executionOrder) {
      const node = tree[sessionId];
      if (!node) continue;

      const nodeIndex = executionOrder.indexOf(sessionId);
      for (const childId of node.children) {
        const childIndex = executionOrder.indexOf(childId);
        if (childIndex !== -1 && childIndex <= nodeIndex) {
          return false; // Child appears before parent
        }
      }
    }

    return true;
  }
}
