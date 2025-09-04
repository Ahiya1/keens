/**
 * SecurityValidator - Security vulnerability scanning
 * FIXED: Updated severity types and added missing scanDuration property
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SecurityScanResult, SecurityVulnerability } from '../types.js';

const execAsync = promisify(exec);

interface SecurityOptions {
  silentMode?: boolean;
  timeout?: number;
}

export class SecurityValidator {
  private options: SecurityOptions;
  
  constructor(options: SecurityOptions = {}) {
    this.options = {
      silentMode: true,
      timeout: 60000,
      ...options
    };
  }
  
  /**
   * Scan for security vulnerabilities
   */
  async scanVulnerabilities(projectPath: string): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];
    const autoFixesAvailable: string[] = [];
    
    try {
      // 1. Check for package.json and run npm audit if available
      const npmAuditResults = await this.runNpmAudit(projectPath);
      vulnerabilities.push(...npmAuditResults.vulnerabilities);
      recommendations.push(...npmAuditResults.recommendations);
      autoFixesAvailable.push(...npmAuditResults.autoFixes);
      
      // 2. Static code analysis for common security issues
      const codeAnalysisResults = await this.analyzeCodeForSecurityIssues(projectPath);
      vulnerabilities.push(...codeAnalysisResults.vulnerabilities);
      recommendations.push(...codeAnalysisResults.recommendations);
      
      // 3. Configuration security checks
      const configResults = await this.checkSecurityConfigurations(projectPath);
      vulnerabilities.push(...configResults.vulnerabilities);
      recommendations.push(...configResults.recommendations);
      
      // Determine overall severity
      const severity = this.determineSeverity(vulnerabilities);
      const scanDuration = Date.now() - startTime;
      
      return {
        vulnerabilities,
        severity,
        scanDuration,
        recommendations: [...new Set(recommendations)], // Remove duplicates
        autoFixesAvailable: [...new Set(autoFixesAvailable)],
      };
      
    } catch (error: any) {
      const scanDuration = Date.now() - startTime;
      return {
        vulnerabilities: [{,
          type: 'security_scan_error',
          severity: 'medium',
          description: `Security scan failed: ${error.message}`,
          recommendation: 'Check security scanning tools and dependencies',
        }],
        severity: 'medium',
        scanDuration,
        recommendations: ['Install security scanning tools'],
        autoFixesAvailable: [],
      };
    }
  }
  
  /**
   * Run npm audit for dependency vulnerabilities
   */
  private async runNpmAudit(projectPath: string): Promise<{
    vulnerabilities: SecurityVulnerability[];
    recommendations: string[];
    autoFixes: string[];
  }> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];
    const autoFixes: string[] = [];
    
    try {
      // Check if package.json exists
      const packagePath = path.join(projectPath, 'package.json');
      await fs.access(packagePath);
      
      // Run npm audit
      const silentFlag = this.options.silentMode ? ' --silent' : '';
      const { stdout, stderr } = await execAsync(`cd "${projectPath}" && npm audit --json${silentFlag}`, {
        timeout: this.options.timeout,
        maxBuffer: 2 * 1024 * 1024,
      });
      
      if (stdout) {
        try {
          const auditResult = JSON.parse(stdout);
          
          if (auditResult.vulnerabilities) {
            for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities as any)) {
              const vuln = vulnData as any;
              vulnerabilities.push({
                type: 'dependency_vulnerability',
                severity: this.mapNpmSeverity(vuln.severity),
                description: `${packageName}: ${vuln.title || 'Dependency vulnerability'}`,
                cwe: vuln.cwe ? vuln.cwe.join(', ') : undefined,
                recommendation: vuln.patched_versions ? `Update to: ${vuln.patched_versions}` : 'Update dependency'
              });
            }
          }
          
          // Check for fixable issues
          if (auditResult.metadata && auditResult.metadata.totalDependencies > 0) {
            recommendations.push('Run "npm audit fix" to automatically fix vulnerabilities');
            autoFixes.push('dependency_vulnerabilities');
          }
          
        } catch (parseError) {
          recommendations.push('npm audit output could not be parsed');
        }
      }
      
    } catch (error: any) {
      if (error.message.includes('ENOENT') || error.message.includes('package.json')) {
        recommendations.push('No package.json found - dependency scanning skipped');
      } else if (error.code === 1) {
        // npm audit exit code 1 means vulnerabilities found
        recommendations.push('npm audit found vulnerabilities - check npm audit output');
      } else {
        recommendations.push('npm audit not available or failed');
      }
    }
    
    return { vulnerabilities, recommendations, autoFixes };
  }
  
  /**
   * Analyze code for common security issues
   */
  private async analyzeCodeForSecurityIssues(projectPath: string): Promise<{
    vulnerabilities: SecurityVulnerability[];
    recommendations: string[];
  }> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];
    
    try {
      // Find source files
      const sourceFiles = await this.findSourceFiles(projectPath);
      
      for (const file of sourceFiles.slice(0, 20)) { // Limit for performance
        const fileVulns = await this.scanFileForSecurityIssues(file, projectPath);
        vulnerabilities.push(...fileVulns);
      }
      
      if (vulnerabilities.length === 0) {
        recommendations.push('No obvious security issues found in code analysis');
      } else {
        recommendations.push('Review and fix identified security issues');
        recommendations.push('Consider using a comprehensive security linter like ESLint security plugin');
      }
      
    } catch (error) {
      recommendations.push('Code security analysis failed - manual review recommended');
    }
    
    return { vulnerabilities, recommendations };
  }
  
  /**
   * Find source files for security scanning
   */
  private async findSourceFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.php', '.rb'];
    
    try {
      const srcDir = path.join(projectPath, 'src');
      const srcExists = await fs.access(srcDir).then(() => true).catch(() => false);
      
      if (srcExists) {
        const srcFiles = await this.findFilesRecursive(srcDir, extensions);
        files.push(...srcFiles);
      }
      
      // Also check root directory for important files
      const rootFiles = await fs.readdir(projectPath);
      for (const file of rootFiles) {
        const filePath = path.join(projectPath, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile() && extensions.includes(path.extname(file))) {
          files.push(filePath);
        }
      }
      
    } catch (error) {
      // Return empty array if directory scanning fails
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
        
        // Skip problematic directories
        if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') {
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
   * Scan individual file for security issues
   */
  private async scanFileForSecurityIssues(filePath: string, projectPath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const relativeFilePath = path.relative(projectPath, filePath);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check for common security anti-patterns
        
        // 1. SQL Injection patterns
        if (line.match(/query\s*=\s*['"]SELECT.*\$\{|\+.*['"]/) || 
            line.match(/\$\{.*\}.*SELECT|INSERT|UPDATE|DELETE/)) {
          vulnerabilities.push({
            type: 'sql_injection_risk',
            severity: 'high',
            description: 'Potential SQL injection vulnerability detected',
            file: relativeFilePath,
            line: lineNumber,
            cwe: 'CWE-89',
            recommendation: 'Use parameterized queries or prepared statements',
          });
        }
        
        // 2. Command injection patterns
        if (line.match(/exec\(|system\(|eval\(/) && line.includes('${')) {
          vulnerabilities.push({
            type: 'command_injection_risk',
            severity: 'high',
            description: 'Potential command injection vulnerability detected',
            file: relativeFilePath,
            line: lineNumber,
            cwe: 'CWE-78',
            recommendation: 'Validate and sanitize user input before executing commands',
          });
        }
        
        // 3. Hardcoded secrets
        if (line.match(/password\s*=\s*['"][^'"]{8,}['"]|api_key\s*=\s*['"][^'"]{20,}['"]|secret\s*=\s*['"][^'"]{16,}['"]/i)) {
          vulnerabilities.push({
            type: 'hardcoded_secret',
            severity: 'critical',
            description: 'Hardcoded secret or password detected',
            file: relativeFilePath,
            line: lineNumber,
            cwe: 'CWE-798',
            recommendation: 'Use environment variables or secure configuration management',
          });
        }
        
        // 4. Insecure random number generation
        if (line.includes('Math.random()')) {
          vulnerabilities.push({
            type: 'weak_random',
            severity: 'medium',
            description: 'Weak random number generation detected',
            file: relativeFilePath,
            line: lineNumber,
            cwe: 'CWE-338',
            recommendation: 'Use cryptographically secure random number generator',
          });
        }
        
        // 5. Debug/console statements in production
        if (line.includes('console.log(') && !line.includes('//')) {
          vulnerabilities.push({
            type: 'information_exposure',
            severity: 'low',
            description: 'Console.log statement may expose sensitive information',
            file: relativeFilePath,
            line: lineNumber,
            cwe: 'CWE-200',
            recommendation: 'Remove debug statements before production deployment',
          });
        }
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
    
    return vulnerabilities;
  }
  
  /**
   * Check security configurations
   */
  private async checkSecurityConfigurations(projectPath: string): Promise<{
    vulnerabilities: SecurityVulnerability[];
    recommendations: string[];
  }> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check package.json for security-related configurations
      await this.checkPackageJsonSecurity(projectPath, vulnerabilities, recommendations);
      
      // Check for .env files
      await this.checkEnvironmentFiles(projectPath, vulnerabilities, recommendations);
      
      // Check for common config files
      await this.checkConfigurationFiles(projectPath, vulnerabilities, recommendations);
      
    } catch (error) {
      recommendations.push('Configuration security check failed');
    }
    
    return { vulnerabilities, recommendations };
  }
  
  /**
   * Check package.json for security issues
   */
  private async checkPackageJsonSecurity(
    projectPath: string, 
    vulnerabilities: SecurityVulnerability[], 
    recommendations: string[],
  ): Promise<void> {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(content);
      
      // Check for security-related packages
      const securityPackages = ['helmet', 'bcrypt', 'jsonwebtoken', 'express-rate-limit'];
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const hasSecurityPackages = securityPackages.some(pkg => deps[pkg]);
      
      if (!hasSecurityPackages && deps.express) {
        vulnerabilities.push({
          type: 'missing_security_middleware',
          severity: 'medium',
          description: 'Express app detected but security middleware packages not found',
          recommendation: 'Install security packages like helmet, express-rate-limit',
        });
      }
      
      // Check for deprecated packages (simplified check)
      if (deps.request) {
        vulnerabilities.push({
          type: 'deprecated_package',
          severity: 'low',
          description: 'Deprecated "request" package detected',
          recommendation: 'Replace with axios or node-fetch',
        });
      }
      
    } catch (error) {
      // package.json not found or not readable
    }
  }
  
  /**
   * Check environment files
   */
  private async checkEnvironmentFiles(
    projectPath: string, 
    vulnerabilities: SecurityVulnerability[], 
    recommendations: string[],
  ): Promise<void> {
    const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
    
    for (const envFile of envFiles) {
      try {
        const envPath = path.join(projectPath, envFile);
        await fs.access(envPath);
        
        // Check if .env is in .gitignore
        try {
          const gitignorePath = path.join(projectPath, '.gitignore');
          const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
          
          if (!gitignoreContent.includes('.env')) {
            vulnerabilities.push({
              type: 'env_file_exposure',
              severity: 'high',
              description: '.env file found but not in .gitignore',
              file: '.gitignore',
              recommendation: 'Add .env* to .gitignore to prevent secret exposure',
            });
          }
        } catch (gitignoreError) {
          vulnerabilities.push({
            type: 'missing_gitignore',
            severity: 'medium',
            description: '.env file found but no .gitignore exists',
            recommendation: 'Create .gitignore and add .env* to prevent secret exposure',
          });
        }
        
      } catch (error) {
        // .env file doesn't exist, which is fine
      }
    }
  }
  
  /**
   * Check configuration files
   */
  private async checkConfigurationFiles(
    projectPath: string, 
    vulnerabilities: SecurityVulnerability[], 
    recommendations: string[],
  ): Promise<void> {
    // Check for common sensitive config files
    const sensitiveFiles = ['config.json', 'secrets.json', 'keys.json'];
    
    for (const file of sensitiveFiles) {
      try {
        const filePath = path.join(projectPath, file);
        await fs.access(filePath);
        
        vulnerabilities.push({
          type: 'sensitive_config_file',
          severity: 'medium',
          description: `Potentially sensitive configuration file found: ${file}`,
          file,
          recommendation: 'Ensure sensitive config files are in .gitignore and use environment variables instead',
        });
        
      } catch (error) {
        // File doesn't exist, which is good
      }
    }
  }
  
  /**
   * Map npm audit severity to our severity scale - FIXED: Removed 'info' type
   */
  private mapNpmSeverity(npmSeverity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (npmSeverity.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': return 'medium';
      case 'low': return 'low';
      default: return 'low'; // FIXED: Default to 'low' instead of 'info',
    }
  }
  
  /**
   * Determine overall severity from vulnerabilities - FIXED: Removed 'info' type
   */
  private determineSeverity(vulnerabilities: SecurityVulnerability[]): 'critical' | 'high' | 'medium' | 'low' {
    if (vulnerabilities.some(v => v.severity === 'critical')) return 'critical';
    if (vulnerabilities.some(v => v.severity === 'high')) return 'high';
    if (vulnerabilities.some(v => v.severity === 'medium')) return 'medium';
    return 'low'; // FIXED: Default to 'low' instead of 'info'
  }
}
