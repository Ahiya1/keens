/**
 * Phase 3.3: Get Agent Status Tool
 * Reports the status of the sequential agent tree and execution metrics
 * Provides comprehensive visibility into recursive agent hierarchy
 */

import { AgentExecutionContext, AgentTreeStatus, AgentTreeNode } from '../types.js';
import chalk from 'chalk';

export class GetAgentStatusTool {
  getDescription(): string {
    return 'Report the status of the sequential agent tree, including hierarchy, execution metrics, and current state of all agents.';
  }

  getInputSchema() {
    return {
      type: 'object',
      properties: {
        includeMetrics: {
          type: 'boolean',
          description: 'Include detailed execution metrics for each agent',
          default: true,
        },
        includeVisualization: {
          type: 'boolean',
          description: 'Include ASCII tree visualization',
          default: true,
        },
        filterBy: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['running', 'completed', 'failed', 'cancelled'],
              description: 'Filter agents by status',
            },
            specialization: {
              type: 'string',
              enum: ['frontend', 'backend', 'database', 'testing', 'security', 'devops', 'general'],
              description: 'Filter agents by specialization',
            },
            phase: {
              type: 'string',
              enum: ['EXPLORE', 'PLAN', 'FOUND', 'SUMMON', 'COMPLETE'],
              description: 'Filter agents by current phase',
            },
            minDepth: {
              type: 'number',
              description: 'Minimum tree depth to include',
              minimum: 0,
            },
            maxDepth: {
              type: 'number',
              description: 'Maximum tree depth to include',
              minimum: 0,
            }
          }
        },
        sortBy: {
          type: 'string',
          enum: ['startTime', 'depth', 'specialization', 'status', 'duration'],
          description: 'Sort agents by specified field',
          default: 'startTime',
        }
      },
      required: [],
    };
  }

  async execute(
    parameters: {
      includeMetrics?: boolean;
      includeVisualization?: boolean;
      filterBy?: {
        status?: string;
        specialization?: string;
        phase?: string;
        minDepth?: number;
        maxDepth?: number;
      };
      sortBy?: string;
    },
    context: AgentExecutionContext
  ): Promise<any> {
    try {
      // Validate that we have AgentTreeManager
      const agentTreeManager = context.toolManagerOptions?.agentTreeManager;
      if (!agentTreeManager) {
        throw new Error('AgentTreeManager not available - cannot report agent status');
      }
      
      // Get tree status
      const treeStatus: AgentTreeStatus = agentTreeManager.getTreeStatus();
      const currentNode = agentTreeManager.getNode(context.sessionId);

      // Apply filters
      const filteredNodes = this.filterNodes(treeStatus.tree, parameters.filterBy || {});

      // Sort nodes
      const sortedNodes = this.sortNodes(filteredNodes, parameters.sortBy || 'startTime');

      // Generate metrics if requested
      const metrics = parameters.includeMetrics !== false ?
        this.generateMetrics(treeStatus, sortedNodes) : null;

      // Generate visualization if requested
      const visualization = parameters.includeVisualization !== false ?
        agentTreeManager.getTreeVisualization() : null;

      // Display summary
      this.displayStatusSummary(treeStatus, currentNode, sortedNodes.length);

      if (visualization) {
        console.log(chalk.blue("\n🌳 Agent Tree Visualization"));
        console.log(visualization);
      }

      if (metrics) {
        this.displayMetrics(metrics);
      }

      // Display filtered agents
      if (sortedNodes.length > 0) {
        console.log(chalk.blue("\n📋 Agent Details"));
        sortedNodes.forEach((node, index) => {
          this.displayAgentDetails(node, index + 1);
        });
      }

      return {
        success: true,
        treeStatus,
        currentNode,
        filteredAgents: sortedNodes.map(node => ({
          sessionId: node.sessionId,
          specialization: node.specialization,
          phase: node.phase,
          status: node.status,
          depth: node.depth,
          gitBranch: node.gitBranch,
          duration: node.endTime ?
            node.endTime.getTime() - node.startTime.getTime() :
            Date.now() - node.startTime.getTime(),
          childCount: node.children.length,
        })),
        metrics,
        visualization,
        filters: parameters.filterBy,
        sortBy: parameters.sortBy || 'startTime',
        totalAgentsInTree: Object.keys(treeStatus.tree).length,
        filteredCount: sortedNodes.length,
      };

    } catch (error: any) {
      console.error(chalk.red(`❌ Error getting agent status: ${error.message}`));
      return {
        success: false,
        error: `Failed to get agent status: ${error.message}`,
        sessionId: context.sessionId,
      };
    }
  }

  /**
   * Filter agents based on criteria
   */
  private filterNodes(
    tree: Record<string, AgentTreeNode>,
    filter: {
      status?: string;
      specialization?: string;
      phase?: string;
      minDepth?: number;
      maxDepth?: number;
    }
  ): AgentTreeNode[] {
    let nodes = Object.values(tree);

    if (filter.status) {
      nodes = nodes.filter(node => node.status === filter.status);
    }

    if (filter.specialization) {
      nodes = nodes.filter(node => node.specialization === filter.specialization);
    }

    if (filter.phase) {
      nodes = nodes.filter(node => node.phase === filter.phase);
    }

    if (filter.minDepth !== undefined) {
      nodes = nodes.filter(node => node.depth >= filter.minDepth!);
    }

    if (filter.maxDepth !== undefined) {
      nodes = nodes.filter(node => node.depth <= filter.maxDepth!);
    }

    return nodes;
  }

  /**
   * Sort agents by specified field
   */
  private sortNodes(nodes: AgentTreeNode[], sortBy: string): AgentTreeNode[] {
    return [...nodes].sort((a, b) => {
      switch (sortBy) {
        case 'startTime':
          return a.startTime.getTime() - b.startTime.getTime();

        case 'depth':
          return a.depth - b.depth;

        case 'specialization':
          return a.specialization.localeCompare(b.specialization);

        case 'status':
          return a.status.localeCompare(b.status);

        case 'duration':
          const aDuration = a.endTime ?
            a.endTime.getTime() - a.startTime.getTime() :
            Date.now() - a.startTime.getTime();
          const bDuration = b.endTime ?
            b.endTime.getTime() - b.startTime.getTime() :
            Date.now() - b.startTime.getTime();
          return aDuration - bDuration;

        default:
          return a.startTime.getTime() - b.startTime.getTime();
      }
    });
  }

  /**
   * Generate comprehensive metrics
   */
  private generateMetrics(
    treeStatus: AgentTreeStatus,
    filteredNodes: AgentTreeNode[]
  ): any {
    const nodes = Object.values(treeStatus.tree);
    const now = Date.now();

    // Calculate durations
    const durations = nodes.map(node => {
      return node.endTime ?
        node.endTime.getTime() - node.startTime.getTime() :
        now - node.startTime.getTime();
    });

    // Specialization distribution
    const specializationCounts = nodes.reduce((acc, node) => {
      acc[node.specialization] = (acc[node.specialization] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Phase distribution
    const phaseCounts = nodes.reduce((acc, node) => {
      acc[node.phase] = (acc[node.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Depth distribution
    const depthCounts = nodes.reduce((acc, node) => {
      acc[node.depth] = (acc[node.depth] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      execution: {
        totalNodes: treeStatus.totalNodes,
        activeNodes: treeStatus.activeNodes,
        completedNodes: treeStatus.completedNodes,
        failedNodes: treeStatus.failedNodes,
        successRate: treeStatus.totalNodes > 0 ?
          treeStatus.completedNodes / (treeStatus.completedNodes + treeStatus.failedNodes) : 0
      },
      timing: {
        averageDuration: durations.length > 0 ?
          durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        totalExecutionTime: durations.reduce((a, b) => a + b, 0)
      },
      hierarchy: {
        maxDepth: treeStatus.maxDepth,
        averageDepth: nodes.length > 0 ?
          nodes.reduce((sum, node) => sum + node.depth, 0) / nodes.length : 0,
        depthDistribution: depthCounts,
      },
      specialization: {
        distribution: specializationCounts,
        mostCommon: Object.entries(specializationCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
      },
      phases: {
        distribution: phaseCounts,
        activePhases: Object.keys(phaseCounts).filter(phase => phaseCounts[phase] > 0),
      },
      filtered: {
        totalFiltered: filteredNodes.length,
        percentageOfTotal: treeStatus.totalNodes > 0 ?
          (filteredNodes.length / treeStatus.totalNodes) * 100 : 0
      }
    };
  }

  /**
   * Display status summary
   */
  private displayStatusSummary(
    treeStatus: AgentTreeStatus,
    currentNode: AgentTreeNode | undefined,
    filteredCount: number
  ): void {
    console.log(chalk.blue("\n📊 Agent Tree Status Summary"));
    console.log(chalk.cyan(`   Total Agents: ${treeStatus.totalNodes}`));
    console.log(chalk.green(`   Active: ${treeStatus.activeNodes}`));
    console.log(chalk.green(`   Completed: ${treeStatus.completedNodes}`));
    console.log(chalk.red(`   Failed: ${treeStatus.failedNodes}`));
    console.log(chalk.gray(`   Max Depth: ${treeStatus.maxDepth}`));
    console.log(chalk.gray(`   Filtered Results: ${filteredCount}`));
    
    if (currentNode) {
      console.log(chalk.yellow(`\n🤖 Current Agent: ${currentNode.sessionId}`));
      console.log(chalk.gray(`   Specialization: ${currentNode.specialization}`));
      console.log(chalk.gray(`   Phase: ${currentNode.phase}`));
      console.log(chalk.gray(`   Status: ${currentNode.status}`));
      console.log(chalk.gray(`   Depth: ${currentNode.depth}`));
    }
  }

  /**
   * Display detailed metrics
   */
  private displayMetrics(metrics: any): void {
    console.log(chalk.blue("\n📈 Execution Metrics"));
    console.log(chalk.cyan(`   Success Rate: ${(metrics.execution.successRate * 100).toFixed(1)}%`));
    console.log(chalk.cyan(`   Average Duration: ${Math.round(metrics.timing.averageDuration / 1000)}s`));
    console.log(chalk.cyan(`   Total Execution Time: ${Math.round(metrics.timing.totalExecutionTime / 1000)}s`));
    console.log(chalk.cyan(`   Average Depth: ${metrics.hierarchy.averageDepth.toFixed(1)}`));
    
    console.log(chalk.blue("\n🔧 Specialization Distribution:"));
    Object.entries(metrics.specialization.distribution).forEach(([spec, count]: [string, any]) => {
      console.log(chalk.gray(`   ${spec}: ${count} agents`));
    });
    
    console.log(chalk.blue("\n🔄 Phase Distribution:"));
    Object.entries(metrics.phases.distribution).forEach(([phase, count]: [string, any]) => {
      console.log(chalk.gray(`   ${phase}: ${count} agents`));
    });
  }

  /**
   * Display individual agent details
   */
  private displayAgentDetails(node: AgentTreeNode, index: number): void {
    const duration = node.endTime ?
      node.endTime.getTime() - node.startTime.getTime() :
      Date.now() - node.startTime.getTime();

    const statusIcon = {
      running: '🔄',
      completed: '✅',
      failed: '❌',
      cancelled: '⏹️',
    }[node.status] || '❓';

    const indent = '  '.repeat(node.depth);

    console.log(chalk.white(
      `${index}. ${indent}${statusIcon} ${node.sessionId.split('-').pop()} ` +
      `(${node.specialization}) [${node.phase}] {${node.gitBranch}}`
    ));
    console.log(chalk.gray(
      `${indent}   Duration: ${Math.round(duration / 1000)}s | ` +
      `Depth: ${node.depth} | Children: ${node.children.length} | ` +
      `Started: ${node.startTime.toISOString()}`
    ));

    if (node.result && node.status === 'completed') {
      console.log(chalk.gray(
        `${indent}   Files: ${(node.result.filesCreated?.length || 0)} created, ` +
        `${(node.result.filesModified?.length || 0)} modified`
      ));
    }
  }
}
