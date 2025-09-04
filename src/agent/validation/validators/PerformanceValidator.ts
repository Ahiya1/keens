/**
 * PerformanceValidator - Performance analysis and optimization
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PerformanceAnalysis, PerformanceBottleneck, PerformanceMetric } from '../types.js';

const execAsync = promisify(exec);

interface PerformanceOptions {
  silentMode?: boolean;
  timeout?: number;
}

export class PerformanceValidator {
  private options: PerformanceOptions;
  
  constructor(options: PerformanceOptions = {}) {
    this.options = {
      silentMode: true,
      timeout: 45000,
      ...options
    };
  }
  
  /**
   * Analyze project performance
   */
  async analyzePerformance(projectPath: string): Promise<PerformanceAnalysis> {
    const bottlenecks: PerformanceBottleneck[] = [];
    const optimizations: string[] = [];
    const metrics: PerformanceMetric[] = [];
    
    try {
      // 1. Bundle size analysis
      const bundleAnalysis = await this.analyzeBundleSize(projectPath);
      bottlenecks.push(...bundleAnalysis.bottlenecks);
      optimizations.push(...bundleAnalysis.optimizations);
      metrics.push(...bundleAnalysis.metrics);
      
      // 2. Code complexity analysis
      const complexityAnalysis = await this.analyzeCodeComplexity(projectPath);
      bottlenecks.push(...complexityAnalysis.bottlenecks);
      optimizations.push(...complexityAnalysis.optimizations);
      metrics.push(...complexityAnalysis.metrics);
      
      // 3. Dependency analysis
      const depAnalysis = await this.analyzeDependencies(projectPath);
      bottlenecks.push(...depAnalysis.bottlenecks);
      optimizations.push(...depAnalysis.optimizations);
      metrics.push(...depAnalysis.metrics);
      
      // 4. Build performance
      const buildAnalysis = await this.analyzeBuildPerformance(projectPath);
      bottlenecks.push(...buildAnalysis.bottlenecks);
      optimizations.push(...buildAnalysis.optimizations);
      metrics.push(...buildAnalysis.metrics);
      
      // Calculate overall score
      const score = this.calculatePerformanceScore(bottlenecks, metrics);
      
      return {
        score,
        bottlenecks,
        optimizations: [...new Set(optimizations)], // Remove duplicates
        metrics
      };
      
    } catch (error: any) {
      return {
        score: 70, // Neutral score when analysis fails
        bottlenecks: [{
          type: 'performance_analysis_error',
          severity: 'low',
          description: `Performance analysis failed: ${error.message}`,
          recommendation: 'Performance analysis tools may need configuration',
        }],
        optimizations: ['Set up performance monitoring and analysis tools'],
        metrics: [],
      };
    }
  }
  
  /**
   * Analyze bundle size and build output
   */
  private async analyzeBundleSize(projectPath: string): Promise<{
    bottlenecks: PerformanceBottleneck[];
    optimizations: string[];
    metrics: PerformanceMetric[];
  }> {
    const bottlenecks: PerformanceBottleneck[] = [];
    const optimizations: string[] = [];
    const metrics: PerformanceMetric[] = [];
    
    try {
      // Check if there's a build directory
      const buildDirs = ['dist', 'build', 'out'];
      let buildDir = '';
      
      for (const dir of buildDirs) {
        try {
          const dirPath = path.join(projectPath, dir);
          const stat = await fs.stat(dirPath);
          if (stat.isDirectory()) {
            buildDir = dirPath;
            break;
          }
        } catch (error) {
          // Directory doesn't exist, continue
        }
      }
      
      if (buildDir) {
        const buildSize = await this.calculateDirectorySize(buildDir);
        const buildSizeMB = buildSize / (1024 * 1024);
        
        metrics.push({
          name: 'build_size',
          value: buildSizeMB,
          unit: 'MB',
          threshold: 5,
          status: buildSizeMB > 10 ? 'critical' : buildSizeMB > 5 ? 'warning' : 'good',
        });
        
        if (buildSizeMB > 10) {
          bottlenecks.push({
            type: 'large_bundle_size',
            severity: 'medium',
            description: `Build output is large (${buildSizeMB.toFixed(1)}MB)`,
            recommendation: 'Consider code splitting, tree shaking, or removing unused dependencies',
          });
          optimizations.push('Implement code splitting and lazy loading');
          optimizations.push('Analyze bundle with webpack-bundle-analyzer');
        }
        
        // Check for large individual files
        const largeFiles = await this.findLargeFiles(buildDir, 1024 * 1024); // 1MB threshold
        if (largeFiles.length > 0) {
          bottlenecks.push({
            type: 'large_files',
            severity: 'low',
            description: `Found ${largeFiles.length} large files in build output`,
            recommendation: 'Optimize large files or split them',
          });
        }
      }
      
      // Check package.json for bundle optimization settings
      await this.checkBundleOptimization(projectPath, bottlenecks, optimizations);
      
    } catch (error) {
      optimizations.push('Set up build size monitoring');
    }
    
    return { bottlenecks, optimizations, metrics };
  }
  
  /**
   * Analyze code complexity
   */
  private async analyzeCodeComplexity(projectPath: string): Promise<{
    bottlenecks: PerformanceBottleneck[];
    optimizations: string[];
    metrics: PerformanceMetric[];
  }> {
    const bottlenecks: PerformanceBottleneck[] = [];
    const optimizations: string[] = [];
    const metrics: PerformanceMetric[] = [];
    
    try {
      // Find source files
      const sourceFiles = await this.findSourceFiles(projectPath);
      let totalComplexity = 0;
      let totalLines = 0;
      let complexFunctions = 0;
      
      for (const file of sourceFiles.slice(0, 20)) { // Limit for performance
        const analysis = await this.analyzeFileComplexity(file);
        totalComplexity += analysis.complexity;
        totalLines += analysis.lines;
        complexFunctions += analysis.complexFunctions;
      }
      
      const avgComplexity = sourceFiles.length > 0 ? totalComplexity / sourceFiles.length : 0;
      
      metrics.push({
        name: 'average_complexity',
        value: avgComplexity,
        unit: 'score',
        threshold: 10,
        status: avgComplexity > 15 ? 'critical' : avgComplexity > 10 ? 'warning' : 'good',
      });
      
      if (avgComplexity > 10) {
        bottlenecks.push({
          type: 'high_complexity',
          severity: avgComplexity > 15 ? 'medium' : 'low',
          description: `High code complexity detected (avg: ${avgComplexity.toFixed(1)})`,
          recommendation: 'Refactor complex functions and reduce cyclomatic complexity',
        });
        optimizations.push('Break down complex functions into smaller ones');
        optimizations.push('Use design patterns to reduce complexity');
      }
      
      if (complexFunctions > 5) {
        bottlenecks.push({
          type: 'complex_functions',
          severity: 'low',
          description: `Found ${complexFunctions} highly complex functions`,
          recommendation: 'Refactor complex functions for better maintainability',
        });
      }
      
    } catch (error) {
      optimizations.push('Consider using complexity analysis tools like plato or jscpd');
    }
    
    return { bottlenecks, optimizations, metrics };
  }
  
  /**
   * Analyze dependencies for performance impact
   */
  private async analyzeDependencies(projectPath: string): Promise<{
    bottlenecks: PerformanceBottleneck[];
    optimizations: string[];
    metrics: PerformanceMetric[];
  }> {
    const bottlenecks: PerformanceBottleneck[] = [];
    const optimizations: string[] = [];
    const metrics: PerformanceMetric[] = [];
    
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      
      const totalDeps = Object.keys(dependencies).length + Object.keys(devDependencies).length;
      
      metrics.push({
        name: 'total_dependencies',
        value: totalDeps,
        unit: 'count',
        threshold: 50,
        status: totalDeps > 100 ? 'critical' : totalDeps > 50 ? 'warning' : 'good',
      });
      
      if (totalDeps > 50) {
        bottlenecks.push({
          type: 'many_dependencies',
          severity: totalDeps > 100 ? 'medium' : 'low',
          description: `High number of dependencies (${totalDeps})`,
          recommendation: 'Audit dependencies and remove unused ones',
        });
        optimizations.push('Run "npm audit" and "npx depcheck" to find unused dependencies');
      }
      
      // Check for known heavy dependencies
      const heavyDeps = ['lodash', 'moment', 'core-js', 'babel-polyfill'];
      const foundHeavyDeps = heavyDeps.filter(dep => dependencies[dep]);
      
      if (foundHeavyDeps.length > 0) {
        bottlenecks.push({
          type: 'heavy_dependencies',
          severity: 'low',
          description: `Heavy dependencies detected: ${foundHeavyDeps.join(', ')}`,
          recommendation: 'Consider lighter alternatives (e.g., date-fns instead of moment, lodash-es instead of lodash)',
        });
        optimizations.push('Replace heavy dependencies with lighter alternatives');
      }
      
      // Check for duplicate functionality
      const httpLibs = ['axios', 'request', 'node-fetch', 'got'].filter(lib => dependencies[lib]);
      if (httpLibs.length > 1) {
        optimizations.push(`Multiple HTTP libraries found (${httpLibs.join(', ')}) - consider standardizing on one`);
      }
      
    } catch (error) {
      optimizations.push('Analyze package.json for dependency optimization opportunities');
    }
    
    return { bottlenecks, optimizations, metrics };
  }
  
  /**
   * Analyze build performance
   */
  private async analyzeBuildPerformance(projectPath: string): Promise<{
    bottlenecks: PerformanceBottleneck[];
    optimizations: string[];
    metrics: PerformanceMetric[];
  }> {
    const bottlenecks: PerformanceBottleneck[] = [];
    const optimizations: string[] = [];
    const metrics: PerformanceMetric[] = [];
    
    try {
      // Try to run a build and measure time
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.scripts && packageJson.scripts.build) {
        const startTime = Date.now();
        
        try {
          const silentFlag = this.options.silentMode ? ' --silent' : '';
          await execAsync(`cd "${projectPath}" && npm run build${silentFlag}`, {
            timeout: this.options.timeout,
            maxBuffer: 1024 * 1024,
          });
          
          const buildTime = Date.now() - startTime;
          const buildTimeSeconds = buildTime / 1000;
          
          metrics.push({
            name: 'build_time',
            value: buildTimeSeconds,
            unit: 'seconds',
            threshold: 60,
            status: buildTimeSeconds > 120 ? 'critical' : buildTimeSeconds > 60 ? 'warning' : 'good',
          });
          
          if (buildTimeSeconds > 60) {
            bottlenecks.push({
              type: 'slow_build',
              severity: buildTimeSeconds > 120 ? 'medium' : 'low',
              description: `Build time is slow (${buildTimeSeconds.toFixed(1)}s)`,
              recommendation: 'Optimize build process with caching, parallel processing, or incremental builds',
            });
            optimizations.push('Implement build caching');
            optimizations.push('Use parallel processing for build tasks');
          }
          
        } catch (buildError: any) {
          if (buildError.message.includes('timeout')) {
            bottlenecks.push({
              type: 'build_timeout',
              severity: 'medium',
              description: 'Build process timed out',
              recommendation: 'Optimize build process or increase timeout',
            });
          } else {
            optimizations.push('Fix build errors before performance analysis');
          }
        }
      } else {
        optimizations.push('Add build script to package.json for performance monitoring');
      }
      
    } catch (error) {
      optimizations.push('Set up build performance monitoring');
    }
    
    return { bottlenecks, optimizations, metrics };
  }
  
  /**
   * Calculate directory size recursively
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath);
        } else if (item.isFile()) {
          const stat = await fs.stat(fullPath);
          totalSize += stat.size;
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    
    return totalSize;
  }
  
  /**
   * Find large files in directory
   */
  private async findLargeFiles(dirPath: string, threshold: number): Promise<string[]> {
    const largeFiles: string[] = [];
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findLargeFiles(fullPath, threshold);
          largeFiles.push(...subFiles);
        } else if (item.isFile()) {
          const stat = await fs.stat(fullPath);
          if (stat.size > threshold) {
            largeFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    
    return largeFiles;
  }
  
  /**
   * Find source files
   */
  private async findSourceFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    
    try {
      const srcDir = path.join(projectPath, 'src');
      const srcExists = await fs.access(srcDir).then(() => true).catch(() => false);
      
      if (srcExists) {
        const srcFiles = await this.findFilesRecursive(srcDir, extensions);
        files.push(...srcFiles);
      }
    } catch (error) {
      // Return empty array if src directory scanning fails
    }
    
    return files;
  }
  
  /**
   * Recursively find files with specific extensions
   */
  private async findFilesRecursive(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.name.startsWith('.') || item.name === 'node_modules') {
          continue;
        }
        
        if (item.isDirectory()) {
          const subFiles = await this.findFilesRecursive(fullPath, extensions);
          files.push(...subFiles);
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    
    return files;
  }
  
  /**
   * Analyze file complexity
   */
  private async analyzeFileComplexity(filePath: string): Promise<{
    complexity: number;
    lines: number;
    complexFunctions: number;
  }> {
    let complexity = 0;
    let lines = 0;
    let complexFunctions = 0;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const codeLines = content.split('\n');
      lines = codeLines.length;
      
      // Simple complexity calculation based on control structures
      for (const line of codeLines) {
        const trimmedLine = line.trim();
        
        // Count decision points
        if (trimmedLine.match(/\b(if|else|while|for|switch|case|catch|&&|\|\|)\b/)) {
          complexity++;
        }
        
        // Count nested structures
        if (trimmedLine.match(/\{.*\{|\(.*\(/)) {
          complexity++;
        }
        
        // Identify potentially complex functions
        if (trimmedLine.includes('function') || trimmedLine.match(/=>.*\{/)) {
          const functionComplexity = this.calculateLineComplexity(line);
          if (functionComplexity > 5) {
            complexFunctions++;
          }
        }
      }
      
    } catch (error) {
      // Return default values if file can't be read
    }
    
    return { complexity, lines, complexFunctions };
  }
  
  /**
   * Calculate complexity of a single line
   */
  private calculateLineComplexity(line: string): number {
    let complexity = 0;
    
    // Count complexity indicators
    const indicators = [/\bif\b/, /\belse\b/, /\bwhile\b/, /\bfor\b/, /&&/, /\|\|/, /\?.*:/];
    
    for (const indicator of indicators) {
      if (line.match(indicator)) {
        complexity++;
      }
    }
    
    return complexity;
  }
  
  /**
   * Check for bundle optimization settings
   */
  private async checkBundleOptimization(
    projectPath: string,
    bottlenecks: PerformanceBottleneck[],
    optimizations: string[],
  ): Promise<void> {
    try {
      // Check webpack config
      const webpackConfigs = ['webpack.config.js', 'webpack.prod.js', 'webpack.production.js'];
      let hasWebpackOptimization = false;
      
      for (const configFile of webpackConfigs) {
        try {
          const configPath = path.join(projectPath, configFile);
          const content = await fs.readFile(configPath, 'utf8');
          
          if (content.includes('optimization') || content.includes('TerserPlugin') || content.includes('minimize')) {
            hasWebpackOptimization = true;
            break;
          }
        } catch (error) {
          // Config file doesn't exist, continue
        }
      }
      
      if (!hasWebpackOptimization) {
        optimizations.push('Configure webpack optimization settings for production builds');
      }
      
      // Check for Next.js optimization
      try {
        const nextConfigPath = path.join(projectPath, 'next.config.js');
        const nextContent = await fs.readFile(nextConfigPath, 'utf8');
        
        if (!nextContent.includes('compress') && !nextContent.includes('optimize')) {
          optimizations.push('Configure Next.js optimization settings');
        }
      } catch (error) {
        // Next.js config doesn't exist, that's fine
      }
      
    } catch (error) {
      // Bundle optimization check failed
    }
  }
  
  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(
    bottlenecks: PerformanceBottleneck[],
    metrics: PerformanceMetric[],
  ): number {
    let score = 100;
    
    // Deduct points for bottlenecks
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }
    
    // Adjust score based on metrics
    for (const metric of metrics) {
      if (metric.status === 'critical') {
        score -= 10;
      } else if (metric.status === 'warning') {
        score -= 5;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }
}
