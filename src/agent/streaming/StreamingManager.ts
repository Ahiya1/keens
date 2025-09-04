/**
 * keen StreamingManager - COMPLETE FINAL FIX
 * Properly handles signature_delta events and all streaming correctly
 */

import { EventEmitter } from "events";
import chalk from "chalk";

export interface StreamingEvent {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop"
    | "error"
    | "thinking_start"
    | "thinking_delta"
    | "thinking_stop"
    | "tool_use_start"
    | "tool_use_delta"
    | "tool_use_stop";
  data?: any;
  index?: number;
  timestamp: number;
}

export interface StreamingState {
  isActive: boolean;
  messageId?: string;
  currentBlockIndex: number;
  textBuffer: string;
  thinkingBuffer: string;
  thinkingBlocks: ThinkingBlock[];
  toolCalls: ToolCall[];
  totalTokens: number;
  startTime: number;
  error?: Error;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
  signature?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

export interface StreamingOptions {
  showProgress?: boolean;
  bufferSize?: number;
  timeout?: number;
  enableTypewriter?: boolean;
  typewriterDelay?: number;
  verbose?: boolean;
  debug?: boolean;
  onProgress?: (progress: StreamingProgress) => void;
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onComplete?: (state: StreamingState) => void;
  onError?: (error: Error) => void;
}

export interface StreamingProgress {
  phase:,
    | "starting"
    | "streaming"
    | "thinking"
    | "tool_use"
    | "complete"
    | "error";
  percentage?: number;
  message?: string;
  tokensReceived: number;
  elapsedTime: number;
}

export class StreamingManager extends EventEmitter {
  private state: StreamingState;
  private options: StreamingOptions;
  private textBuffer: string = "";
  private typewriterTimer?: NodeJS.Timeout;
  private progressTimer?: NodeJS.Timeout;
  private timeoutTimer?: NodeJS.Timeout;
  private lastProgressUpdate = 0;

  constructor(options: StreamingOptions = {}) {
    super();
    this.options = {
      showProgress: true,
      bufferSize: 64,
      timeout: 300000, // 5 minutes
      enableTypewriter: false,
      typewriterDelay: 20,
      verbose: false,
      debug: false,
      ...options,
    };

    this.state = this.initializeState();
    this.setupEventHandlers();
  }

  private initializeState(): StreamingState {
    return {
      isActive: false,
      currentBlockIndex: 0,
      textBuffer: "",
      thinkingBuffer: "",
      thinkingBlocks: [],
      toolCalls: [],
      totalTokens: 0,
      startTime: 0,
    };
  }

  private setupEventHandlers(): void {
    this.on("progress", (progress: StreamingProgress) => {
      this.options.onProgress?.(progress);
    });

    this.on("text", (text: string) => {
      this.options.onText?.(text);
    });

    this.on("thinking", (thinking: string) => {
      this.options.onThinking?.(thinking);
    });

    this.on("toolCall", (toolCall: ToolCall) => {
      this.options.onToolCall?.(toolCall);
    });

    this.on("complete", (state: StreamingState) => {
      this.options.onComplete?.(state);
    });

    this.on("error", (error: Error) => {
      this.options.onError?.(error);
    });
  }

  startStreaming(): void {
    this.state = this.initializeState();
    this.state.isActive = true;
    this.state.startTime = Date.now();
    this.textBuffer = "";
    this.lastProgressUpdate = 0;

    // Setup timeout
    if (this.options.timeout) {
      this.timeoutTimer = setTimeout(() => {
        this.handleError(
          new Error(`Streaming timeout after ${this.options.timeout}ms`)
        );
      }, this.options.timeout);
    }

    // Start progress reporting
    this.startProgressReporting();

    this.emitProgress("starting", "Initiating streaming connection...");

    if (this.options.debug) {
      console.log(chalk.blue("🔄 Starting streaming session"), {
        timeout: this.options.timeout,
        showProgress: this.options.showProgress,
      });
    }
  }

  handleStreamingEvent(event: StreamingEvent): void {
    if (!this.state.isActive) {
      if (this.options.debug) {
        console.log(chalk.yellow("⚠️  Received event after streaming stopped"), {
          type: event.type,
        });
      }
      return;
    }

    if (this.options.debug) {
      console.log(chalk.cyan("🔄 Processing streaming event"), {
        type: event.type,
        index: event.index,
        hasData: !!event.data,
      });
    }

    try {
      switch (event.type) {
        case "message_start":
          this.handleMessageStart(event);
          break;

        case "content_block_start":
          this.handleContentBlockStart(event);
          break;

        case "content_block_delta":
          this.handleContentBlockDelta(event);
          break;

        case "content_block_stop":
          this.handleContentBlockStop(event);
          break;

        case "thinking_start":
          this.handleThinkingStart(event);
          break;

        case "thinking_delta":
          this.handleThinkingDelta(event);
          break;

        case "thinking_stop":
          this.handleThinkingStop(event);
          break;

        case "tool_use_start":
          this.handleToolUseStart(event);
          break;

        case "tool_use_delta":
          this.handleToolUseDelta(event);
          break;

        case "tool_use_stop":
          this.handleToolUseStop(event);
          break;

        case "message_delta":
          this.handleMessageDelta(event);
          break;

        case "message_stop":
          this.handleMessageStop(event);
          break;

        case "error":
          this.handleError(event.data);
          break;

        default:
          if (this.options.debug) {
            console.log(chalk.yellow("⚠️  Unknown streaming event type"), {
              type: event.type,
              event,
            });
          }
          break;
      }
    } catch (error) {
      console.error(chalk.red("❌ Error processing streaming event"), {
        event: event.type,
        error: (error as Error).message,
      });
      this.handleError(error as Error);
    }
  }

  private handleMessageStart(event: StreamingEvent): void {
    this.state.messageId = event.data?.message?.id;
    this.emitProgress("streaming", "Message started...");
  }

  private handleContentBlockStart(event: StreamingEvent): void {
    this.state.currentBlockIndex = event.index || 0;

    if (event.data?.content_block?.type === "text") {
      this.emitProgress("streaming", "Receiving text...");
    } else if (event.data?.content_block?.type === "thinking") {
      this.emitProgress("thinking", "Claude is thinking...");
    }
  }

  private handleContentBlockDelta(event: StreamingEvent): void {
    if (event.data?.delta?.type === "text_delta" && event.data.delta.text) {
      const text = event.data.delta.text;
      this.state.textBuffer += text;

      if (this.options.enableTypewriter) {
        this.addToTypewriterBuffer(text);
      } else {
        this.flushTextBuffer(text);
      }
    } else if (
      event.data?.delta?.type === "thinking_delta" &&
      event.data.delta.thinking
    ) {
      const thinking = event.data.delta.thinking;
      this.state.thinkingBuffer += thinking;
      this.emit("thinking", thinking);

      if (this.options.verbose) {
        process.stdout.write(chalk.gray(thinking));
      }
    }
  }

  private handleContentBlockStop(event: StreamingEvent): void {
    this.flushAllBuffers();
  }

  private handleThinkingStart(event: StreamingEvent): void {
    this.emitProgress("thinking", "Claude is thinking...");

    if (this.options.verbose) {
      console.log(chalk.gray("💭 Thinking started..."));
    }
  }

  private handleThinkingDelta(event: StreamingEvent): void {
    if (event.data?.delta?.thinking) {
      const thinking = event.data.delta.thinking;
      this.state.thinkingBuffer += thinking;
      this.emit("thinking", thinking);

      if (this.options.verbose) {
        process.stdout.write(chalk.gray(thinking));
      }
    }
  }

  private handleThinkingStop(event: StreamingEvent): void {
    if (this.state.thinkingBuffer.trim()) {
      // FIXED: Don't create thinking block here - it's handled in processAnthropicStream
      // This method is just for internal state management
      this.state.thinkingBuffer = "";

      if (this.options.verbose) {
        console.log(chalk.gray("💭 Thinking completed"));
      }
    }
  }

  private handleToolUseStart(event: StreamingEvent): void {
    this.emitProgress("tool_use", "Using tools...");

    if (this.options.verbose) {
      console.log(chalk.blue("🔧 Tool use started"));
    }
  }

  private handleToolUseDelta(event: StreamingEvent): void {
    if (this.options.debug) {
      console.log(chalk.cyan("🔧 Tool delta received"), event.data?.delta);
    }
  }

  private handleToolUseStop(event: StreamingEvent): void {
    if (event.data) {
      const toolCall: ToolCall = {
        id: event.data.id || `tool_${Date.now()}`,
        name: event.data.name || "unknown",
        parameters: event.data.input || {},
      };

      this.state.toolCalls.push(toolCall);
      this.emit("toolCall", toolCall);

      if (this.options.verbose) {
        console.log(chalk.blue(`🔧 Tool completed: ${toolCall.name}`));
      }
    }
  }

  private handleMessageDelta(event: StreamingEvent): void {
    if (event.data?.usage) {
      this.state.totalTokens =
        (event.data.usage.input_tokens || 0) +
        (event.data.usage.output_tokens || 0) +
        (event.data.usage.thinking_tokens || 0);
    }
  }

  private handleMessageStop(event: StreamingEvent): void {
    this.completeStreaming();
  }

  private handleError(error: Error): void {
    this.state.error = error;
    this.state.isActive = false;
    this.cleanup();

    this.emitProgress("error", `Error: ${error.message}`);
    this.emit("error", error);

    console.error(chalk.red("❌ Streaming error:"), error.message);

    if (this.options.debug) {
      console.error(chalk.gray("Debug state:"), this.getPublicState());
    }
  }

  private addToTypewriterBuffer(text: string): void {
    this.textBuffer += text;

    if (!this.typewriterTimer) {
      this.startTypewriter();
    }
  }

  private startTypewriter(): void {
    this.typewriterTimer = setInterval(() => {
      if (this.textBuffer.length === 0) {
        if (this.typewriterTimer) {
          clearInterval(this.typewriterTimer);
          this.typewriterTimer = undefined;
        }
        return;
      }

      const char = this.textBuffer.charAt(0);
      this.textBuffer = this.textBuffer.slice(1);

      process.stdout.write(char);
      this.emit("text", char);
    }, this.options.typewriterDelay || 20);
  }

  private flushTextBuffer(text?: string): void {
    if (text && this.options.verbose) {
      process.stdout.write(text);
      this.emit("text", text);
    }
  }

  private flushAllBuffers(): void {
    if (this.textBuffer) {
      this.flushTextBuffer(this.textBuffer);
      this.textBuffer = "";
    }
  }

  private startProgressReporting(): void {
    if (!this.options.showProgress) return;

    this.progressTimer = setInterval(() => {
      if (this.state.isActive) {
        const elapsedTime = Date.now() - this.state.startTime;

        if (elapsedTime - this.lastProgressUpdate > 5000) {
          this.emitProgress("streaming", undefined, elapsedTime);
          this.lastProgressUpdate = elapsedTime;
        }
      }
    }, 1000);
  }

  private emitProgress(
    phase: StreamingProgress["phase"],
    message?: string,
    elapsedTime?: number
  ): void {
    const progress: StreamingProgress = {
      phase,
      message,
      tokensReceived: this.state.totalTokens,
      elapsedTime: elapsedTime || Date.now() - this.state.startTime,
    };

    this.emit("progress", progress);

    if (this.options.showProgress && message) {
      const elapsed = Math.round(progress.elapsedTime / 1000);
      console.log(chalk.cyan(`📊 [${elapsed}s] ${message}`));
    }
  }

  private completeStreaming(): void {
    this.state.isActive = false;
    this.flushAllBuffers();
    this.cleanup();

    this.emitProgress("complete", "Streaming complete");
    this.emit("complete", this.state);

    if (this.options.verbose) {
      const duration = Math.round((Date.now() - this.state.startTime) / 1000);
      console.log(chalk.green(`✅ Streaming completed in ${duration}s`));
    }
  }

  private cleanup(): void {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = undefined;
    }

    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = undefined;
    }
  }

  stopStreaming(): void {
    if (this.state.isActive) {
      this.state.isActive = false;
      this.cleanup();
      this.emitProgress("complete", "Streaming stopped by user");
      this.emit("complete", this.state);
    }
  }

  isStreaming(): boolean {
    return this.state.isActive;
  }

  getState(): StreamingState {
    return { ...this.state };
  }

  getPublicState(): Omit<StreamingState, "error"> {
    const { error, ...publicState } = this.state;
    return publicState;
  }

  static createStreamingEvent(
    type: StreamingEvent["type"],
    data?: any,
    index?: number
  ): StreamingEvent {
    return {
      type,
      data,
      index,
      timestamp: Date.now(),
    };
  }

  static isStreamingSupported(): boolean {
    return (
      typeof process !== "undefined" &&
      process.stdout &&
      process.stdout.isTTY &&
      process.env.NODE_ENV !== "test"
    );
  }

  // COMPLETE FINAL FIX: Process Anthropic stream and build proper content blocks with signatures
  static async processAnthropicStream(
    stream: AsyncIterable<any>,
    streamingManager: StreamingManager,
  ): Promise<any> {
    streamingManager.startStreaming();

    let finalMessage: any = {
      content: [],
      id: null,
      model: null,
      role: "assistant",
      stop_reason: null,
      stop_sequence: null,
      type: "message",
      usage: null,
    };

    // Track content blocks by index as they're built
    const contentBlocks: any[] = [];

    try {
      for await (const event of stream) {
        const streamingEvent = StreamingManager.createStreamingEvent(
          event.type,
          event,
          event.index
        );

        streamingManager.handleStreamingEvent(streamingEvent);

        // Build final message from stream events
        switch (event.type) {
          case "message_start":
            if (event.message) {
              finalMessage = { ...event.message };
              finalMessage.content = []; // Ensure content starts empty
            }
            break;

          case "content_block_start":
            const startIndex = event.index || 0;
            if (event.content_block) {
              // Initialize the content block based on its type
              contentBlocks[startIndex] = { ...event.content_block };

              // For different block types, initialize appropriately
              if (event.content_block.type === "text") {
                contentBlocks[startIndex].text = "";
              } else if (event.content_block.type === "thinking") {
                contentBlocks[startIndex].thinking = "";
                // CRITICAL FIX: Initialize signature as empty string, will be built from signature_delta events
                contentBlocks[startIndex].signature = "";
              }
            }
            break;

          case "content_block_delta":
            const deltaIndex = event.index || 0;
            if (event.delta && contentBlocks[deltaIndex]) {
              // Handle different delta types
              if (event.delta.type === "text_delta" && event.delta.text) {
                contentBlocks[deltaIndex].text =
                  (contentBlocks[deltaIndex].text || "") + event.delta.text;
              } else if (
                event.delta.type === "thinking_delta" &&
                event.delta.thinking
              ) {
                contentBlocks[deltaIndex].thinking =
                  (contentBlocks[deltaIndex].thinking || "") +
                  event.delta.thinking;
              }
              // CRITICAL FIX: Handle signature_delta events
              else if (
                event.delta.type === "signature_delta" &&
                event.delta.signature
              ) {
                if (!contentBlocks[deltaIndex].signature) {
                  contentBlocks[deltaIndex].signature = "";
                }
                contentBlocks[deltaIndex].signature += event.delta.signature;
              }
              // Handle tool use input accumulation
              else if (
                event.delta.type === "input_json_delta" &&
                event.delta.partial_json
              ) {
                if (!contentBlocks[deltaIndex]._inputBuffer) {
                  contentBlocks[deltaIndex]._inputBuffer = "";
                }
                contentBlocks[deltaIndex]._inputBuffer +=
                  event.delta.partial_json;
              }
            }
            break;

          case "content_block_stop":
            const stopIndex = event.index || 0;
            if (contentBlocks[stopIndex]) {
              // Parse accumulated JSON for tool use
              if (contentBlocks[stopIndex]._inputBuffer) {
                try {
                  contentBlocks[stopIndex].input = JSON.parse(
                    contentBlocks[stopIndex]._inputBuffer
                  );
                  delete contentBlocks[stopIndex]._inputBuffer;
                } catch (e) {
                  console.warn("Failed to parse tool input JSON");
                }
              }

              // CRITICAL FIX: For thinking blocks, ensure signature is present
              if (contentBlocks[stopIndex].type === "thinking") {
                // If no signature was received (shouldn't happen but safety check)
                if (!contentBlocks[stopIndex].signature) {
                  console.warn(
                    "Warning: thinking block received without signature"
                  );
                  // Don't set a fake signature - let it be empty and let API handle it
                  contentBlocks[stopIndex].signature = "";
                }
              }
            }
            break;

          case "message_delta":
            if (event.delta) {
              Object.assign(finalMessage, event.delta);
            }
            break;

          case "message_stop":
            // Include all content blocks including thinking blocks with proper signatures
            finalMessage.content = contentBlocks.filter(
              (block) => block !== undefined
            );
            break;
        }
      }

      return finalMessage;
    } catch (error) {
      streamingManager.handleStreamingEvent(
        StreamingManager.createStreamingEvent("error", error)
      );
      throw error;
    }
  }
}