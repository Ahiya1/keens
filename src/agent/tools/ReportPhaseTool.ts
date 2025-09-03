/**
 * report_phase Tool
 * Report the current phase of agent execution and provide status updates
 * UPDATED: Enhanced to support all 5 phases of the agent lifecycle
 */

import chalk from 'chalk';
import { AgentPhase } from '../types.js';

export class ReportPhaseTool {
  getDescription(): string {
    return 'Report the current phase of agent execution and provide status updates';
  }
  
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        phase: {
          type: 'string',
          description: 'Current phase of agent execution',
          enum: ['EXPLORE', 'PLAN', 'FOUND', 'SUMMON', 'COMPLETE']
        },
        summary: {
          type: 'string',
          description: 'Summary of what was accomplished in this phase'
        },
        confidence: {
          type: 'number',
          description: 'Confidence level in the current approach (0-1)',
          minimum: 0,
          maximum: 1
        },
        estimatedTimeRemaining: {
          type: 'string',
          description: 'Estimated time to complete remaining work'
        },
        keyFindings: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key findings or insights from the current phase'
        },
        nextActions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Planned actions for the next phase'
        }
      },
      required: ['phase', 'summary']
    };
  }
  
  async execute(parameters: any, context: any): Promise<any> {
    const {
      phase,
      summary,
      confidence = 0.8,
      estimatedTimeRemaining,
      keyFindings = [],
      nextActions = []
    } = parameters;
    
    // Validate phase - now supports all 5 phases
    const validPhases = ['EXPLORE', 'PLAN', 'FOUND', 'SUMMON', 'COMPLETE'];
    if (!validPhases.includes(phase)) {
      throw new Error(`Invalid phase: ${phase}. Must be one of: ${validPhases.join(', ')}`);
    }
    
    // Display phase report to user
    if (!context.dryRun) {
      this.displayPhaseReport({
        phase,
        summary,
        confidence,
        estimatedTimeRemaining,
        keyFindings,
        nextActions
      });
    }
    
    return {
      success: true,
      phase,
      summary,
      confidence,
      estimatedTimeRemaining,
      keyFindings,
      nextActions,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId
    };
  }
  
  /**
   * Display formatted phase report
   */
  private displayPhaseReport(report: any): void {
    const phaseEmojis: Record<string, string> = {
      'EXPLORE': '🔍',
      'PLAN': '📋', 
      'FOUND': '🏗️',
      'SUMMON': '🎭',
      'COMPLETE': '✅'
    };
    
    const phaseColors: Record<string, any> = {
      'EXPLORE': chalk.blue,
      'PLAN': chalk.cyan,
      'FOUND': chalk.magenta,
      'SUMMON': chalk.yellow,
      'COMPLETE': chalk.green
    };
    
    const emoji = phaseEmojis[report.phase] || '🤖';
    const colorFn = phaseColors[report.phase] || chalk.white;
    
    console.log('\n' + colorFn('='.repeat(60)));
    console.log(colorFn(`${emoji} PHASE REPORT: ${report.phase}`));
    
    if (report.phase !== 'COMPLETE') {
      console.log(colorFn(`🔄 Transition: ${this.getPreviousPhase(report.phase)} → ${report.phase}`));
    }
    
    console.log('\n' + chalk.white('📋 Summary: ') + report.summary);
    
    if (report.confidence) {
      const confidenceBar = this.getConfidenceBar(report.confidence);
      console.log(chalk.white('🎯 Confidence: ') + confidenceBar + chalk.gray(` ${Math.round(report.confidence * 100)}%`));
    }
    
    if (report.keyFindings && report.keyFindings.length > 0) {
      console.log('\n' + chalk.cyan('🔍 Key Findings:'));
      report.keyFindings.forEach((finding: string) => 
        console.log(chalk.gray(`  • ${finding}`))
      );
    }
    
    if (report.nextActions && report.nextActions.length > 0) {
      console.log('\n' + chalk.magenta('⏭️  Next Actions:'));
      report.nextActions.forEach((action: string) => 
        console.log(chalk.gray(`  • ${action}`))
      );
    }
    
    if (report.estimatedTimeRemaining) {
      console.log('\n' + chalk.yellow('⏱️  Estimated Time Remaining: ') + report.estimatedTimeRemaining);
    }
    
    // Phase-specific guidance
    const phaseGuidance = this.getPhaseGuidance(report.phase);
    console.log('\n' + chalk.gray(`💡 ${phaseGuidance}`));
    console.log(colorFn('='.repeat(60)));
  }
  
  /**
   * Get confidence bar visualization
   */
  private getConfidenceBar(confidence: number): string {
    const barLength = 20;
    const filled = Math.round(confidence * barLength);
    const empty = barLength - filled;
    
    let color = chalk.red;
    if (confidence >= 0.7) color = chalk.green;
    else if (confidence >= 0.5) color = chalk.yellow;
    
    return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }
  
  /**
   * Get previous phase for transition display
   */
  private getPreviousPhase(currentPhase: string): string {
    const phaseOrder = ['START', 'EXPLORE', 'PLAN', 'FOUND', 'SUMMON', 'COMPLETE'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return currentIndex > 0 ? phaseOrder[currentIndex - 1] : 'START';
  }
  
  /**
   * Get phase-specific guidance
   */
  private getPhaseGuidance(phase: string): string {
    const guidance: Record<string, string> = {
      'EXPLORE': '🔍 Focus: Understanding project structure, requirements, and current state',
      'PLAN': '📋 Focus: Create detailed implementation plan and identify specialization opportunities', 
      'FOUND': '🏗️ Focus: Build foundation, establish patterns, and prepare for specialization',
      'SUMMON': '🎭 Focus: Implement solutions and spawn specialists when needed',
      'COMPLETE': '✅ Focus: Finalize work, run tests, and prepare completion report'
    };
    
    return guidance[phase] || '🤖 Execute assigned tasks with precision and focus';
  }
}