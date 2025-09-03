/**
 * Phase 3.3: Agent Tree Manager
 * Manages hierarchical agent relationships, git branch coordination, and sequential execution
 * Implements recursive agent spawning with workspace isolation
 */

import {
  AgentTreeNode,
  AgentTreeStatus,
  AgentSpawnRequest,
  AgentSpawnResult,
  AgentSpecialization,
  AgentPhase,
  GitBranchUtils,
} from "./types.js";
import { UserContext, DatabaseManager } from "../database/DatabaseManager.js";
import { SessionDAO } from "../database/dao/SessionDAO.js";
import { GitTool } from "./tools/GitTool.js";
import chalk from "chalk";

export class AgentTreeManager {
  private tree: Map<string, AgentTreeNode> = new Map();
  private executionOrder: string[] = [];
  private db?: DatabaseManager;
  private sessionDAO?: SessionDAO;
  private userContext?: UserContext;
  private gitTool: GitTool;
  private debug: boolean;

  constructor(options: {
    userContext?: UserContext;
    db?: DatabaseManager;
    debug?: boolean;
  }) {
    this.userContext = options.userContext;
    this.db = options.db;
    this.debug = options.debug || false;
    this.gitTool = new GitTool();

    if (this.db) {
      this.sessionDAO = new SessionDAO(this.db);
    }
  }

  /**
   * Initialize the tree with a root agent session
   */
  initializeRoot(
    sessionId: string,
    specialization: AgentSpecialization = "general",
    workingDirectory: string
  ): void {
    const rootNode: AgentTreeNode = {
      sessionId,
      children: [],
      specialization,
      phase: "EXPLORE",
      gitBranch: "main",
      depth: 0,
      startTime: new Date(),
      status: "running",
    };

    this.tree.set(sessionId, rootNode);
    this.executionOrder.push(sessionId);

    this.debugLog("TREE_INIT", "Initialized root agent tree node", {
      sessionId,
      specialization,
      gitBranch: "main",
    });
  }

  /**
   * Generate next child branch name following sequential pattern
   */
  generateChildBranch(parentSessionId: string): string {
    const parentNode = this.tree.get(parentSessionId);
    if (!parentNode) {
      throw new Error(`Parent session ${parentSessionId} not found in tree`);
    }

    // Get existing child branches
    const existingChildren = parentNode.children
      .map((childId) => {
        const childNode = this.tree.get(childId);
        return childNode?.gitBranch || "";
      })
      .filter((branch) => branch);

    const childBranch = GitBranchUtils.nextChildBranch(
      parentNode.gitBranch,
      existingChildren
    );

    this.debugLog("BRANCH_GEN", "Generated child branch name", {
      parentBranch: parentNode.gitBranch,
      childBranch,
      existingChildren,
    });

    return childBranch;
  }

  /**
   * Add a child agent to the tree (Sequential execution - blocks parent)
   */
  async addChild(
    parentSessionId: string,
    childSessionId: string,
    spawnRequest: AgentSpawnRequest
  ): Promise<AgentTreeNode> {
    const parentNode = this.tree.get(parentSessionId);
    if (!parentNode) {
      throw new Error(`Parent session ${parentSessionId} not found in tree`);
    }

    // Check if parent already has an active child (sequential mode)
    const activeChildren = parentNode.children.filter((childId) => {
      const child = this.tree.get(childId);
      return child && child.status === "running";
    });

    if (activeChildren.length > 0) {
      throw new Error(
        `Parent ${parentSessionId} already has active child(ren): ${activeChildren.join(", ")}. ` +
          "Sequential execution requires waiting for current child to complete."
      );
    }

    const childNode: AgentTreeNode = {
      sessionId: childSessionId,
      parentId: parentSessionId,
      children: [],
      specialization: spawnRequest.specialization,
      phase: "EXPLORE",
      gitBranch: spawnRequest.gitBranch,
      depth: parentNode.depth + 1,
      startTime: new Date(),
      status: "running",
    };

    // Add to tree and update parent
    this.tree.set(childSessionId, childNode);
    parentNode.children.push(childSessionId);
    this.executionOrder.push(childSessionId);

    // Create git branch for child
    await this.createChildBranch(
      spawnRequest.workingDirectory,
      spawnRequest.gitBranch
    );

    // Persist to database if available
    if (this.sessionDAO && this.userContext) {
      try {
        await this.sessionDAO.createSession(
          this.userContext.userId,
          {
            sessionId: childSessionId,
            parentSessionId,
            sessionDepth: childNode.depth,
            gitBranch: spawnRequest.gitBranch,
            vision: spawnRequest.vision,
            workingDirectory: spawnRequest.workingDirectory,
            agentOptions: {
              specialization: spawnRequest.specialization,
              maxIterations: spawnRequest.maxIterations,
              costBudget: spawnRequest.costBudget,
            },
          },
          this.userContext
        );
      } catch (error) {
        this.debugLog("DB_ERROR", "Failed to persist child session", {
          error: error instanceof Error ? error.message : error,
          childSessionId,
          parentSessionId,
        });
        // Continue execution even if DB persistence fails
      }
    }

    this.debugLog("CHILD_ADDED", "Added child agent to tree", {
      parentSessionId,
      childSessionId,
      specialization: spawnRequest.specialization,
      gitBranch: spawnRequest.gitBranch,
      depth: childNode.depth,
    });

    return childNode;
  }

  /**
   * Mark a child as completed and merge its branch (Sequential execution)
   */
  async completeChild(
    childSessionId: string,
    result: any,
    workingDirectory: string
  ): Promise<void> {
    const childNode = this.tree.get(childSessionId);
    if (!childNode) {
      throw new Error(`Child session ${childSessionId} not found in tree`);
    }

    // Update child status
    childNode.status = result.success === false ? "failed" : "completed";
    childNode.endTime = new Date();
    childNode.result = result;

    // Merge child branch back to parent (sequential - no conflicts)
    if (childNode.parentId) {
      const parentNode = this.tree.get(childNode.parentId);
      if (parentNode) {
        await this.mergeChildBranch(
          workingDirectory,
          childNode.gitBranch,
          parentNode.gitBranch,
          childSessionId
        );
      }
    }

    // Persist completion to database
    if (this.sessionDAO && this.userContext) {
      try {
        await this.sessionDAO.updateSession(
          childSessionId,
          {
            executionStatus: childNode.status,
            success: childNode.status === "completed",
            completionReport: result,
            endTime: childNode.endTime,
          },
          this.userContext
        );
      } catch (error) {
        this.debugLog("DB_ERROR", "Failed to update child completion", {
          error: error instanceof Error ? error.message : error,
          childSessionId,
        });
      }
    }

    this.debugLog("CHILD_COMPLETE", "Completed child agent", {
      childSessionId,
      status: childNode.status,
      duration: childNode.endTime.getTime() - childNode.startTime.getTime(),
      gitBranch: childNode.gitBranch,
    });
  }

  /**
   * Update phase for a node in the tree
   */
  updatePhase(sessionId: string, newPhase: AgentPhase): void {
    const node = this.tree.get(sessionId);
    if (!node) {
      this.debugLog("PHASE_ERROR", "Session not found for phase update", {
        sessionId,
        newPhase,
      });
      return;
    }

    const oldPhase = node.phase;
    node.phase = newPhase;

    this.debugLog("PHASE_UPDATE", "Updated agent phase", {
      sessionId,
      from: oldPhase,
      to: newPhase,
      depth: node.depth,
    });
  }

  /**
   * Get current tree status
   */
  getTreeStatus(): AgentTreeStatus {
    const nodes = Array.from(this.tree.values());
    const rootNode = nodes.find((n) => !n.parentId);

    return {
      rootSessionId: rootNode?.sessionId || "",
      totalNodes: this.tree.size,
      activeNodes: nodes.filter((n) => n.status === "running").length,
      completedNodes: nodes.filter((n) => n.status === "completed").length,
      failedNodes: nodes.filter((n) => n.status === "failed").length,
      maxDepth: Math.max(...nodes.map((n) => n.depth)),
      tree: Object.fromEntries(this.tree),
      executionOrder: [...this.executionOrder],
    };
  }

  /**
   * Get a specific node from the tree
   */
  getNode(sessionId: string): AgentTreeNode | undefined {
    return this.tree.get(sessionId);
  }

  /**
   * Check if a parent can spawn a new child (sequential execution)
   */
  canSpawnChild(parentSessionId: string): boolean {
    const parentNode = this.tree.get(parentSessionId);
    if (!parentNode || parentNode.status !== "running") {
      return false;
    }

    // In sequential mode, parent can only spawn if no active children
    const activeChildren = parentNode.children.filter((childId) => {
      const child = this.tree.get(childId);
      return child && child.status === "running";
    });

    return activeChildren.length === 0;
  }

  /**
   * Get specialization context for a child agent
   */
  getSpecializationContext(specialization: AgentSpecialization): any {
    const contexts = {
      frontend: {
        focus: "UI components, styling, accessibility, user experience",
        tools: ["React", "Vue", "CSS", "TypeScript", "Webpack"],
        responsibilities: [
          "Component development",
          "Styling",
          "Client-side logic",
          "Testing UI",
        ],
      },
      backend: {
        focus: "Server-side logic, APIs, authentication, data processing",
        tools: ["Node.js", "Express", "Authentication", "Database integration"],
        responsibilities: [
          "API development",
          "Business logic",
          "Authentication",
          "Data validation",
        ],
      },
      database: {
        focus: "Schema design, queries, optimization, data integrity",
        tools: ["PostgreSQL", "Database migrations", "Query optimization"],
        responsibilities: [
          "Schema design",
          "Query writing",
          "Performance tuning",
          "Data modeling",
        ],
      },
      testing: {
        focus: "Test design, automation, quality assurance, coverage",
        tools: ["Jest", "Cypress", "Unit testing", "Integration testing"],
        responsibilities: [
          "Test writing",
          "Test automation",
          "Quality gates",
          "Coverage reports",
        ],
      },
      security: {
        focus: "Authentication, authorization, data protection, audit",
        tools: ["Security scanning", "Authentication systems", "Encryption"],
        responsibilities: [
          "Security audits",
          "Auth implementation",
          "Vulnerability fixes",
          "Compliance",
        ],
      },
      devops: {
        focus: "Deployment, CI/CD, scaling, infrastructure, monitoring",
        tools: ["Docker", "CI/CD pipelines", "Monitoring", "Infrastructure"],
        responsibilities: [
          "Deployment automation",
          "Infrastructure setup",
          "Monitoring",
          "Scaling",
        ],
      },
      general: {
        focus: "Full-stack development, general tasks, coordination",
        tools: ["All available tools"],
        responsibilities: [
          "General development",
          "Task coordination",
          "Full-stack work",
        ],
      },
    };

    return contexts[specialization] || contexts.general;
  }

  /**
   * Create a git branch for child agent
   */
  private async createChildBranch(
    workingDirectory: string,
    branchName: string
  ): Promise<void> {
    try {
      // Create and checkout new branch
      await this.gitTool.execute(
        { action: "checkout", branch: branchName, create: true },
        {
          sessionId: "tree-manager",
          workingDirectory,
          dryRun: false,
          verbose: this.debug,
        }
      );

      this.debugLog("GIT_BRANCH", "Created child branch", {
        branchName,
        workingDirectory,
      });
    } catch (error) {
      this.debugLog("GIT_ERROR", "Failed to create child branch", {
        error: error instanceof Error ? error.message : error,
        branchName,
      });
      throw new Error(`Failed to create git branch ${branchName}: ${error}`);
    }
  }

  /**
   * Merge child branch back to parent (sequential - should not have conflicts)
   */
  private async mergeChildBranch(
    workingDirectory: string,
    childBranch: string,
    parentBranch: string,
    childSessionId: string
  ): Promise<void> {
    try {
      // Checkout parent branch
      await this.gitTool.execute(
        { action: "checkout", branch: parentBranch },
        {
          sessionId: "tree-manager",
          workingDirectory,
          dryRun: false,
          verbose: this.debug,
        }
      );

      // Fast-forward merge (should be clean in sequential mode)
      await this.gitTool.execute(
        {
          action: "merge",
          branch: childBranch,
          message: `[CHILD:${childSessionId}] Merge sequential child agent work`,
        },
        {
          sessionId: "tree-manager",
          workingDirectory,
          dryRun: false,
          verbose: this.debug,
        }
      );

      this.debugLog("GIT_MERGE", "Merged child branch", {
        childBranch,
        parentBranch,
        childSessionId,
      });
    } catch (error) {
      this.debugLog("GIT_ERROR", "Failed to merge child branch", {
        error: error instanceof Error ? error.message : error,
        childBranch,
        parentBranch,
      });
      throw new Error(`Failed to merge child branch ${childBranch}: ${error}`);
    }
  }

  /**
   * Debug logging helper
   */
  private debugLog(category: string, message: string, data?: any): void {
    if (this.debug) {
      const timestamp = new Date().toISOString();
      console.log(chalk.gray(`[${timestamp}] 🌳 [${category}] ${message}`));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  /**
   * Get tree visualization for debugging
   */
  getTreeVisualization(): string {
    const lines: string[] = [];
    const rootNode = Array.from(this.tree.values()).find((n) => !n.parentId);

    if (!rootNode) {
      return "No tree initialized";
    }

    const addNodeToVisualization = (
      nodeId: string,
      depth: number = 0
    ): void => {
      const node = this.tree.get(nodeId);
      if (!node) return;

      const indent = "  ".repeat(depth);
      const statusIcon =
        {
          running: "🔄",
          completed: "✅",
          failed: "❌",
          cancelled: "⏹️",
        }[node.status] || "❓";

      lines.push(
        `${indent}${statusIcon} ${node.sessionId} (${node.specialization}) [${node.phase}] {${node.gitBranch}}`
      );

      // Add children recursively
      node.children.forEach((childId) => {
        addNodeToVisualization(childId, depth + 1);
      });
    };

    lines.push("🌳 Agent Tree:");
    addNodeToVisualization(rootNode.sessionId);

    return lines.join("\n");
  }
}
