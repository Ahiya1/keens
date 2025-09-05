// Check the current timestamp and token expiration
const now = Date.now();
const tokenExpiration = 1757049928713;

console.log('Current timestamp:', now);
console.log('Current date:', new Date(now));
console.log('Token expiration timestamp:', tokenExpiration);
console.log('Token expiration date:', new Date(tokenExpiration));
console.log('Is token expired?', now > tokenExpiration);
console.log('Time difference (ms):', tokenExpiration - now);
console.log('Time difference (minutes):', (tokenExpiration - now) / (1000 * 60));

// Let's also check JWT token decoding
import jwt from 'jsonwebtoken';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiZTU4NGEwOS00YzkzLTQ4YjYtYTQ4NC1hMGU3OWZlOWRkYzkiLCJlbWFpbCI6ImFoaXlhLmJ1dG1hbkBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImFoaXlhX2FkbWluIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaXNBZG1pbiI6dHJ1ZSwiYWRtaW5Qcml2aWxlZ2VzIjp7ImF1ZGl0X2FjY2VzcyI6dHJ1ZSwiZ2xvYmFsX2FjY2VzcyI6dHJ1ZSwidW5saW1pdGVkX2NyZWRpdHMiOnRydWUsImJ5cGFzc19yYXRlX2xpbWl0cyI6dHJ1ZSwicHJpb3JpdHlfZXhlY3V0aW9uIjp0cnVlLCJzeXN0ZW1fZGlhZ25vc3RpY3MiOnRydWUsInVzZXJfaW1wZXJzb25hdGlvbiI6dHJ1ZSwidmlld19hbGxfYW5hbHl0aWNzIjp0cnVlfSwic2NvcGVzIjpbInByb2ZpbGU6cmVhZCIsImNyZWRpdHM6cmVhZCIsImFnZW50czpleGVjdXRlIiwic2Vzc2lvbnM6cmVhZCIsImFkbWluOmFuYWx5dGljcyIsImFkbWluOnVzZXJzOnJlYWQiLCJhZG1pbjp1c2Vyczp3cml0ZSIsImFkbWluOmNyZWRpdHM6d3JpdGUiLCJhZG1pbjpzeXN0ZW06cmVhZCIsImFkbWluOmF1ZGl0OnJlYWQiLCJhZ2VudHM6dW5saW1pdGVkIiwiY3JlZGl0czp1bmxpbWl0ZWQiXSwiaWF0IjoxNzU3MDQ2MzI4LCJleHAiOjE3NTcwNDk5Mjh9.I4v5p9v2m803QIdyfLgwlpeO7BHzXi89gvJqXLVIn6c";

try {
  const decoded = jwt.decode(token);
  console.log('Decoded JWT payload:', JSON.stringify(decoded, null, 2));
  
  if (decoded.exp) {
    console.log('JWT exp field:', decoded.exp);
    console.log('JWT exp as date:', new Date(decoded.exp * 1000));
    console.log('JWT is expired (by JWT exp)?', Math.floor(Date.now() / 1000) > decoded.exp);
  }
} catch (error) {
  console.error('Failed to decode JWT:', error.message);
}