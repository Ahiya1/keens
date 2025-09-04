/**
 * AnthropicConfig - Configuration management for Claude API integration
 * Based on a2s2 implementation with keen-specific enhancements
 * Updated with proper streaming timeout configuration to fix timeout issues
 */

import { EnvLoader } from "./EnvLoader.js";

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  thinkingBudget: number;
  maxRetries: number;
  baseRetryDelay: number;
  enableExtendedContext: boolean;
  enableInterleaved: boolean;
  enableWebSearch: boolean;
  enableStreaming: boolean;
  streamingBufferSize: number;
  streamingTimeout: number; // Fixed to be more reasonable
  showProgressIndicators: boolean;
  typewriterEffect: boolean;
  typewriterDelay: number;
}

export interface ContextUtilization {
  total_capacity: 1000000;
  system_prompt: number;
  project_analysis: number;
  conversation_history: number;
  thinking_blocks: number;
  tool_responses: number;
  available_for_reasoning: number;
}

export class AnthropicConfigManager {
  private config: AnthropicConfig;

  constructor(customConfig: Partial<AnthropicConfig> = {}) {
    // Load environment variables from multiple possible locations
    EnvLoader.load();

    // Build default configuration optimized for keen
    const defaultConfig: AnthropicConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY || "",

      // CORRECTED: Use actual Claude model names
      // Support environment override for future Claude 4 migration
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",

      maxTokens: 16000,
      thinkingBudget: 10000,
      maxRetries: 3,
      baseRetryDelay: 1000,

      // CRITICAL: keen REQUIRES extended context and thinking
      enableExtendedContext: true, // Force enable 1M context for keen
      enableInterleaved: true, // Force enable thinking blocks

      enableWebSearch: true,
      enableStreaming: true,
      streamingBufferSize: 64,
      streamingTimeout: 300000, // FIXED: 5 minutes instead of 50 minutes
      showProgressIndicators: true,
      typewriterEffect: false,
      typewriterDelay: 20,
    };

    // Merge with custom configuration, but enforce keen requirements
    this.config = {
      ...defaultConfig,
      ...customConfig,
      // NEVER allow these to be disabled in keen
      enableExtendedContext: true,
      enableInterleaved: true,
    };

    // Validate the configuration
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey && process.env.NODE_ENV !== "test") {
      throw new Error(
        "ANTHROPIC_API_KEY is required. Set it in your environment variables."
      );
    }

    if (this.config.maxTokens < 1000 || this.config.maxTokens > 200000) {
      throw new Error("maxTokens must be between 1,000 and 200,000");
    }

    if (this.config.thinkingBudget < 0) {
      throw new Error("thinkingBudget must be non-negative");
    }

    if (this.config.thinkingBudget > this.config.maxTokens) {
      throw new Error(
        "thinkingBudget should be less than or equal to maxTokens"
      );
    }

    // Validate keen requirements
    if (!this.config.enableExtendedContext) {
      throw new Error(
        "CRITICAL: keen requires enableExtendedContext=true for 1M context window"
      );
    }

    if (!this.config.enableInterleaved) {
      throw new Error(
        "CRITICAL: keen requires enableInterleaved=true for thinking blocks"
      );
    }

    // Validate model name contains Claude
    if (!this.config.model.toLowerCase().includes("claude")) {
      throw new Error(
        `Invalid model name '${this.config.model}'. keen requires Claude models.`
      );
    }

    // FIXED: Proper timeout validation
    if (
      this.config.streamingTimeout < 10000 || // Minimum 10 seconds
      this.config.streamingTimeout > 600000 // Maximum 10 minutes
    ) {
      throw new Error(
        "streamingTimeout must be between 10 seconds and 10 minutes"
      );
    }

    if (
      this.config.streamingBufferSize < 1 ||
      this.config.streamingBufferSize > 1000
    ) {
      throw new Error(
        "streamingBufferSize must be between 1 and 1000 characters"
      );
    }

    // Warning for non-optimal models
    if (!this.config.model.includes("sonnet")) {
      console.warn(
        `Warning: Model '${this.config.model}' is not a Sonnet variant. ` +
          "keen is optimized for Claude Sonnet models."
      );
    }
  }

  getConfig(): AnthropicConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AnthropicConfig>): void {
    // Prevent disabling critical keen features
    const safeUpdates = {
      ...updates,
      enableExtendedContext: true,
      enableInterleaved: true,
    };

    this.config = { ...this.config, ...safeUpdates };
    this.validateConfig();
  }

  getRequestConfig() {
    return {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      thinking: {
        type: "enabled" as const,
        budget_tokens: this.config.thinkingBudget,
      },
      stream: this.config.enableStreaming,
    };
  }

  getBetaHeaders(): string[] {
    const headers: string[] = [];

    // CRITICAL: Required headers for keen functionality
    if (this.config.enableInterleaved) {
      headers.push("interleaved-thinking-2025-05-14");
    }

    if (this.config.enableExtendedContext) {
      headers.push("context-1m-2025-08-07");
    }

    return headers;
  }

  // NEW: Streaming configuration helpers from A2S2
  getStreamingConfig(): {
    enabled: boolean;
    bufferSize: number;
    timeout: number;
    showProgress: boolean;
    typewriter: boolean;
    typewriterDelay: number;
  } {
    return {
      enabled: this.config.enableStreaming,
      bufferSize: this.config.streamingBufferSize,
      timeout: this.config.streamingTimeout,
      showProgress: this.config.showProgressIndicators,
      typewriter: this.config.typewriterEffect,
      typewriterDelay: this.config.typewriterDelay,
    };
  }

  shouldStream(): boolean {
    return (
      this.config.enableStreaming &&
      process.env.NODE_ENV !== "test" &&
      typeof process !== "undefined" &&
      process.stdout &&
      process.stdout.isTTY
    );
  }

  shouldShowProgress(): boolean {
    return (
      this.config.showProgressIndicators &&
      process.env.NODE_ENV !== "test" &&
      typeof process !== "undefined" &&
      process.stdout &&
      process.stdout.isTTY
    );
  }

  // Calculate total cost for a request
  calculateRequestCost(
    inputTokens: number,
    outputTokens: number,
    thinkingTokens: number = 0,
  ): {
    inputCost: number;
    outputCost: number;
    thinkingCost: number;
    totalCost: number;
    isExtendedPricing: boolean;
    keenCreditCost: number; // 5x markup
  } {
    const isExtendedPricing = inputTokens > 200000;

    // Actual Anthropic pricing
    const inputRate = isExtendedPricing ? 0.000006 : 0.000003;
    const outputRate = isExtendedPricing ? 0.0000225 : 0.000015;
    const thinkingRate = inputRate; // Same as input

    const inputCost = inputTokens * inputRate;
    const outputCost = outputTokens * outputRate;
    const thinkingCost = thinkingTokens * thinkingRate;
    const totalCost = inputCost + outputCost + thinkingCost;

    return {
      inputCost,
      outputCost,
      thinkingCost,
      totalCost,
      isExtendedPricing,
      keenCreditCost: totalCost * 5.0, // 5x markup for keen credits
    };
  }

  // Validate headers are correct for keen
  validateKeenRequirements(): {
    valid: boolean;
    issues: string[];
    betaHeaders: string[];
  } {
    const issues: string[] = [];
    const betaHeaders = this.getBetaHeaders();

    if (!this.config.enableExtendedContext) {
      issues.push("Extended context (1M window) is disabled");
    }

    if (!this.config.enableInterleaved) {
      issues.push("Interleaved thinking is disabled");
    }

    if (!betaHeaders.includes("context-1m-2025-08-07")) {
      issues.push("Missing 'context-1m-2025-08-07' beta header");
    }

    if (!betaHeaders.includes("interleaved-thinking-2025-05-14")) {
      issues.push("Missing 'interleaved-thinking-2025-05-14' beta header");
    }

    if (!this.config.model.toLowerCase().includes("claude")) {
      issues.push(`Invalid model name '${this.config.model}'`);
    }

    return {
      valid: issues.length === 0,
      issues,
      betaHeaders,
    };
  }

  static validateApiKey(apiKey: string): boolean {
    return (
      typeof apiKey === "string" &&
      apiKey.startsWith("sk-ant-") &&
      apiKey.length > 20
    );
  }

  isProductionReady(): boolean {
    return (
      this.config.apiKey !== "" &&
      AnthropicConfigManager.validateApiKey(this.config.apiKey) &&
      this.config.maxTokens >= 4000 &&
      this.config.thinkingBudget >= 1000 &&
      this.config.enableExtendedContext &&
      this.config.enableInterleaved
    );
  }
}

// Export default recommended configuration for keen
export const KEEN_DEFAULT_CONFIG: Partial<AnthropicConfig> = {
  model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
  maxTokens: 16000,
  thinkingBudget: 10000,
  enableExtendedContext: true,
  enableInterleaved: true,
  enableWebSearch: true,
  enableStreaming: true,
  streamingTimeout: 300000, // FIXED: 5 minutes instead of 50 minutes
  showProgressIndicators: true,
  typewriterEffect: false,
};

// Dynamic function to get default config (picks up runtime env vars)
export function getKeenDefaultConfig(): Partial<AnthropicConfig> {
  return {
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    maxTokens: 16000,
    thinkingBudget: 10000,
    enableExtendedContext: true,
    enableInterleaved: true,
    enableWebSearch: true,
    enableStreaming: true,
    streamingTimeout: 300000, // FIXED: 5 minutes instead of 50 minutes
    showProgressIndicators: true,
    typewriterEffect: false,
  };
}
