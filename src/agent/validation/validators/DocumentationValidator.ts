/**
 * DocumentationValidator - Documentation completeness and quality validation
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ValidationIssue } from '../types.js';

interface DocumentationOptions {
  silentMode?: boolean;
}

interface DocumentationResult {
  score: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

export class DocumentationValidator {
  private options: DocumentationOptions;
  
  constructor(options: DocumentationOptions = {}) {
    this.options = {
      silentMode: true,
      ...options
    };
  }
  
  /**
   * Validate documentation completeness and quality
   */
  async validateDocumentation(projectPath: string): Promise<DocumentationResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    let score = 0;
    
    try {
      // 1. Check for essential documentation files
      const essentialDocsScore = await this.checkEssentialDocumentation(projectPath, issues);
      
      // 2. Check README quality
      const readmeScore = await this.checkReadmeQuality(projectPath, issues);
      
      // 3. Check inline code documentation
      const inlineDocsScore = await this.checkInlineDocumentation(projectPath, issues);
      
      // 4. Check API documentation
      const apiDocsScore = await this.checkApiDocumentation(projectPath, issues);
      
      // 5. Check change documentation
      const changeDocsScore = await this.checkChangeDocumentation(projectPath, issues);
      
      // Calculate weighted score
      score = Math.round(
        essentialDocsScore * 0.3 +
        readmeScore * 0.3 +
        inlineDocsScore * 0.2 +
        apiDocsScore * 0.1 +
        changeDocsScore * 0.1
      );
      
      // Generate suggestions based on score and issues
      this.generateSuggestions(score, issues, suggestions);
      
    } catch (error: any) {
      issues.push({
        type: 'documentation_validation_error',
        severity: 'low',
        message: `Documentation validation failed: ${error.message}`,
        file: '',
        line: 0,
        autoFixable: false,
      });
      suggestions.push('Manual documentation review recommended');
    }
    
    return {
      score,
      issues,
      suggestions
    };
  }
  
  /**
   * Check for essential documentation files
   */
  private async checkEssentialDocumentation(projectPath: string, issues: ValidationIssue[]): Promise<number> {
    let score = 0;
    const maxScore = 100;
    
    const essentialFiles = [
      { name: 'README.md', weight: 40, required: true },
      { name: 'LICENSE', weight: 10, required: false },
      { name: 'CHANGELOG.md', weight: 10, required: false },
      { name: 'CONTRIBUTING.md', weight: 10, required: false },
      { name: 'API.md', weight: 10, required: false },
      { name: '.github/README.md', weight: 5, required: false },
      { name: 'docs/README.md', weight: 5, required: false },
      { name: 'SECURITY.md', weight: 5, required: false },
      { name: 'CODE_OF_CONDUCT.md', weight: 5, required: false }
    ];
    
    for (const file of essentialFiles) {
      try {
        const filePath = path.join(projectPath, file.name);
        await fs.access(filePath);
        
        // File exists, check if it's not empty
        const content = await fs.readFile(filePath, 'utf8');
        if (content.trim().length > 50) {
          score += file.weight;
        } else {
          issues.push({
            type: 'empty_documentation_file',
            severity: 'low',
            message: `${file.name} exists but appears to be empty or too short`,
            file: file.name,
            line: 0,
            autoFixable: false,
            suggestion: `Add meaningful content to ${file.name}`
          });
          score += file.weight * 0.3; // Partial credit for existing file
        }
        
      } catch (error) {
        // File doesn't exist
        if (file.required) {
          issues.push({
            type: 'missing_required_documentation',
            severity: 'medium',
            message: `Required documentation file missing: ${file.name}`,
            file: file.name,
            line: 0,
            autoFixable: false,
            suggestion: `Create ${file.name} with project information`
          });
        } else {
          issues.push({
            type: 'missing_optional_documentation',
            severity: 'low',
            message: `Optional documentation file missing: ${file.name}`,
            file: file.name,
            line: 0,
            autoFixable: false,
            suggestion: `Consider adding ${file.name} for better project documentation`
          });
        }
      }
    }
    
    return Math.min(score, maxScore);
  }
  
  /**
   * Check README.md quality
   */
  private async checkReadmeQuality(projectPath: string, issues: ValidationIssue[]): Promise<number> {
    let score = 0;
    const maxScore = 100;
    
    try {
      const readmePath = path.join(projectPath, 'README.md');
      const content = await fs.readFile(readmePath, 'utf8');
      const lines = content.split('\n');
      
      // Check README length
      if (content.length < 200) {
        issues.push({
          type: 'short_readme',
          severity: 'medium',
          message: 'README.md is very short - consider adding more details',
          file: 'README.md',
          line: 0,
          autoFixable: false,
          suggestion: 'Add installation instructions, usage examples, and project description',
        });
        score += 30;
      } else if (content.length < 500) {
        score += 60;
      } else {
        score += 80;
      }
      
      // Check for essential sections
      const essentialSections = [
        { name: 'title', patterns: [/^#\s+\w/, /^#{1}\s+\w/], weight: 15 },
        { name: 'description', patterns: [/description|about|overview/i], weight: 10 },
        { name: 'installation', patterns: [/install|setup|getting started/i], weight: 15 },
        { name: 'usage', patterns: [/usage|example|how to/i], weight: 15 },
        { name: 'api or features', patterns: [/api|features|commands/i], weight: 10 },
        { name: 'contributing', patterns: [/contribut|development/i], weight: 5 },
        { name: 'license', patterns: [/license/i], weight: 5 }
      ];
      
      for (const section of essentialSections) {
        const hasSection = section.patterns.some(pattern => content.match(pattern));
        if (hasSection) {
          score += section.weight;
        } else {
          issues.push({
            type: 'missing_readme_section',
            severity: 'low',
            message: `README.md missing ${section.name} section`,
            file: 'README.md',
            line: 0,
            autoFixable: false,
            suggestion: `Add a section about ${section.name}`
          });
        }
      }
      
      // Check for code examples
      const hasCodeBlocks = content.includes('```') || content.includes('    ');
      if (hasCodeBlocks) {
        score += 10;
      } else {
        issues.push({
          type: 'no_code_examples',
          severity: 'low',
          message: 'README.md has no code examples',
          file: 'README.md',
          line: 0,
          autoFixable: false,
          suggestion: 'Add code examples to show how to use the project',
        });
      }
      
      // Check for badges (shows maintenance)
      const hasBadges = content.includes('![') || content.includes('[![');
      if (hasBadges) {
        score += 5;
      }
      
    } catch (error) {
      issues.push({
        type: 'readme_not_found',
        severity: 'high',
        message: 'README.md file not found',
        file: 'README.md',
        line: 0,
        autoFixable: false,
        suggestion: 'Create a README.md file with project information',
      });
      return 0;
    }
    
    return Math.min(score, maxScore);
  }
  
  /**
   * Check inline code documentation
   */
  private async checkInlineDocumentation(projectPath: string, issues: ValidationIssue[]): Promise<number> {
    let score = 0;
    const maxScore = 100;
    
    try {
      const sourceFiles = await this.findSourceFiles(projectPath);
      let totalFunctions = 0;
      let documentedFunctions = 0;
      let totalClasses = 0;
      let documentedClasses = 0;
      
      for (const file of sourceFiles.slice(0, 10)) { // Limit for performance
        const analysis = await this.analyzeFileDocumentation(file, projectPath);
        totalFunctions += analysis.totalFunctions;
        documentedFunctions += analysis.documentedFunctions;
        totalClasses += analysis.totalClasses;
        documentedClasses += analysis.documentedClasses;
        
        if (analysis.issues.length > 0) {
          issues.push(...analysis.issues);
        }
      }
      
      // Calculate documentation coverage
      const functionCoverage = totalFunctions > 0 ? (documentedFunctions / totalFunctions) * 100 : 100;
      const classCoverage = totalClasses > 0 ? (documentedClasses / totalClasses) * 100 : 100;
      
      score = Math.round((functionCoverage * 0.7) + (classCoverage * 0.3));
      
      if (functionCoverage < 50) {
        issues.push({
          type: 'low_function_documentation',
          severity: 'medium',
          message: `Low function documentation coverage: ${functionCoverage.toFixed(1)}%`,
          file: '',
          line: 0,
          autoFixable: false,
          suggestion: 'Add JSDoc comments to more functions',
        });
      }
      
      if (classCoverage < 50 && totalClasses > 0) {
        issues.push({
          type: 'low_class_documentation',
          severity: 'medium',
          message: `Low class documentation coverage: ${classCoverage.toFixed(1)}%`,
          file: '',
          line: 0,
          autoFixable: false,
          suggestion: 'Add JSDoc comments to more classes',
        });
      }
      
    } catch (error) {
      score = 60; // Neutral score if analysis fails
    }
    
    return Math.min(score, maxScore);
  }
  
  /**
   * Check API documentation
   */
  private async checkApiDocumentation(projectPath: string, issues: ValidationIssue[]): Promise<number> {
    let score = 0;
    const maxScore = 100;
    
    try {
      // Check for OpenAPI/Swagger documentation
      const apiDocFiles = [
        'swagger.json',
        'swagger.yaml',
        'openapi.json',
        'openapi.yaml',
        'api-docs.json',
        'docs/api.md',
        'API.md'
      ];
      
      let hasApiDocs = false;
      for (const docFile of apiDocFiles) {
        try {
          const docPath = path.join(projectPath, docFile);
          await fs.access(docPath);
          hasApiDocs = true;
          
          const content = await fs.readFile(docPath, 'utf8');
          if (content.length > 100) {
            score += 80;
          } else {
            score += 40;
          }
          break;
        } catch (error) {
          // File doesn't exist, continue
        }
      }
      
      if (!hasApiDocs) {
        // Check if this is likely an API project
        const packagePath = path.join(projectPath, 'package.json');
        try {
          const packageContent = await fs.readFile(packagePath, 'utf8');
          const packageJson = JSON.parse(packageContent);
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          if (deps.express || deps.fastify || deps.koa || deps['@nestjs/core']) {
            issues.push({
              type: 'missing_api_documentation',
              severity: 'medium',
              message: 'API framework detected but no API documentation found',
              file: '',
              line: 0,
              autoFixable: false,
              suggestion: 'Create API documentation using Swagger/OpenAPI or similar',
            });
            score = 20; // Low score for API projects without docs
          } else {
            score = 80; // Not an API project, neutral score
          }
        } catch (error) {
          score = 70; // Can't determine project type
        }
      }
      
      // Check for generated docs
      const docsDirs = ['docs', 'documentation', 'doc'];
      for (const docsDir of docsDirs) {
        try {
          const docsDirPath = path.join(projectPath, docsDir);
          const stat = await fs.stat(docsDirPath);
          if (stat.isDirectory()) {
            score += 20;
            break;
          }
        } catch (error) {
          // Directory doesn't exist
        }
      }
      
    } catch (error) {
      score = 70; // Neutral score if check fails
    }
    
    return Math.min(score, maxScore);
  }
  
  /**
   * Check change documentation (CHANGELOG, version history)
   */
  private async checkChangeDocumentation(projectPath: string, issues: ValidationIssue[]): Promise<number> {
    let score = 0;
    const maxScore = 100;
    
    try {
      // Check for changelog files
      const changelogFiles = ['CHANGELOG.md', 'CHANGELOG.txt', 'HISTORY.md', 'CHANGES.md'];
      let hasChangelog = false;
      
      for (const changelogFile of changelogFiles) {
        try {
          const changelogPath = path.join(projectPath, changelogFile);
          const content = await fs.readFile(changelogPath, 'utf8');
          hasChangelog = true;
          
          if (content.length > 200) {
            score += 60;
          } else {
            score += 30;
          }
          
          // Check if changelog follows semantic versioning
          if (content.match(/##?\s*\[?\d+\.\d+\.\d+/)) {
            score += 20;
          }
          
          break;
        } catch (error) {
          // File doesn't exist, continue
        }
      }
      
      if (!hasChangelog) {
        issues.push({
          type: 'missing_changelog',
          severity: 'low',
          message: 'No changelog found',
          file: '',
          line: 0,
          autoFixable: false,
          suggestion: 'Create a CHANGELOG.md to track project changes',
        });
        score = 40;
      }
      
      // Check package.json version
      try {
        const packagePath = path.join(projectPath, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        if (packageJson.version && packageJson.version !== '1.0.0') {
          score += 20; // Shows version management
        }
      } catch (error) {
        // package.json not found or invalid
      }
      
    } catch (error) {
      score = 60; // Neutral score if check fails
    }
    
    return Math.min(score, maxScore);
  }
  
  /**
   * Find source files for documentation analysis
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
   * Analyze file for documentation
   */
  private async analyzeFileDocumentation(filePath: string, projectPath: string): Promise<{
    totalFunctions: number;
    documentedFunctions: number;
    totalClasses: number;
    documentedClasses: number;
    issues: ValidationIssue[];
  }> {
    const result = {
      totalFunctions: 0,
      documentedFunctions: 0,
      totalClasses: 0,
      documentedClasses: 0,
      issues: [] as ValidationIssue[],
    };
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const relativeFilePath = path.relative(projectPath, filePath);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for function declarations
        if (line.match(/^(export\s+)?(async\s+)?function\s+\w+|^\w+\s*[=:]\s*(async\s+)?\([^)]*\)\s*=>|^(public|private|protected)\s+\w+\s*\(/)) {
          result.totalFunctions++;
          
          // Check if previous lines contain JSDoc comment
          const hasJSDoc = this.hasJSDocAbove(lines, i);
          if (hasJSDoc) {
            result.documentedFunctions++;
          } else {
            result.issues.push({
              type: 'undocumented_function',
              severity: 'low',
              message: 'Function lacks JSDoc documentation',
              file: relativeFilePath,
              line: lineNumber,
              autoFixable: false,
              suggestion: 'Add JSDoc comment to describe function purpose and parameters',
            });
          }
        }
        
        // Check for class declarations
        if (line.match(/^(export\s+)?(abstract\s+)?class\s+\w+/)) {
          result.totalClasses++;
          
          const hasJSDoc = this.hasJSDocAbove(lines, i);
          if (hasJSDoc) {
            result.documentedClasses++;
          } else {
            result.issues.push({
              type: 'undocumented_class',
              severity: 'low',
              message: 'Class lacks JSDoc documentation',
              file: relativeFilePath,
              line: lineNumber,
              autoFixable: false,
              suggestion: 'Add JSDoc comment to describe class purpose',
            });
          }
        }
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
    
    return result;
  }
  
  /**
   * Check if there's a JSDoc comment above the given line
   */
  private hasJSDocAbove(lines: string[], lineIndex: number): boolean {
    // Look at the previous few lines for JSDoc comments
    for (let i = Math.max(0, lineIndex - 5); i < lineIndex; i++) {
      const line = lines[i].trim();
      if (line.includes('/**') || line.includes('*') || line.includes('*/') || line.startsWith('//')) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Generate suggestions based on score and issues
   */
  private generateSuggestions(score: number, issues: ValidationIssue[], suggestions: string[]): void {
    if (score < 30) {
      suggestions.push('Documentation is severely lacking - consider a comprehensive documentation review');
      suggestions.push('Start with creating a detailed README.md');
      suggestions.push('Add inline code comments and JSDoc documentation');
    } else if (score < 60) {
      suggestions.push('Documentation needs improvement in several areas');
      suggestions.push('Focus on missing essential documentation files');
      suggestions.push('Improve inline code documentation coverage');
    } else if (score < 80) {
      suggestions.push('Good documentation foundation - focus on quality improvements');
      suggestions.push('Consider adding more code examples and usage scenarios');
    } else {
      suggestions.push('Excellent documentation! Consider keeping it updated as the project evolves');
    }
    
    // Add specific suggestions based on issue types
    const issueTypes = [...new Set(issues.map(issue => issue.type))];
    
    if (issueTypes.includes('missing_required_documentation')) {
      suggestions.push('Priority: Create missing required documentation files');
    }
    
    if (issueTypes.includes('short_readme')) {
      suggestions.push('Expand README.md with more detailed information');
    }
    
    if (issueTypes.includes('low_function_documentation')) {
      suggestions.push('Add JSDoc comments to improve code documentation coverage');
    }
    
    if (issueTypes.includes('missing_api_documentation')) {
      suggestions.push('Create comprehensive API documentation for better usability');
    }
  }
}
