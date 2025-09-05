/**
 * Simplified Jest Setup for Testing-Focused Tests
 * Minimal setup without broken source dependencies
 */
declare const originalConsoleError: (message?: any, ...optionalParams: any[]) => void;
declare const originalConsoleWarn: (message?: any, ...optionalParams: any[]) => void;
export declare function generateTestId(): string;
export declare function generateTestEmail(prefix?: string): string;
export { originalConsoleError, originalConsoleWarn };
//# sourceMappingURL=jest-simple-setup.d.ts.map