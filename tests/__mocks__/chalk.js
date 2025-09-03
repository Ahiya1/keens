// Mock for chalk to handle ES module issues in Jest

// Create a mock chalk function that returns the input as-is
const mockChalk = (text) => text;

// Add common chalk methods
mockChalk.red = (text) => text;
mockChalk.green = (text) => text;
mockChalk.blue = (text) => text;
mockChalk.yellow = (text) => text;
mockChalk.gray = (text) => text;
mockChalk.grey = (text) => text;
mockChalk.cyan = (text) => text;
mockChalk.magenta = (text) => text;
mockChalk.white = (text) => text;
mockChalk.black = (text) => text;

// Background colors
mockChalk.bgRed = { white: (text) => text };
mockChalk.bgGreen = { white: (text) => text };
mockChalk.bgBlue = { white: (text) => text };
mockChalk.bgYellow = { black: (text) => text };

// Modifiers
mockChalk.bold = (text) => text;
mockChalk.italic = (text) => text;
mockChalk.underline = (text) => text;
mockChalk.dim = (text) => text;

// Export as both default and named
module.exports = mockChalk;
module.exports.default = mockChalk;
