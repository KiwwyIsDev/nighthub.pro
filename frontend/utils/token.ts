// utils/token.ts
import { v4 as uuidv4 } from 'uuid';

export function getOrCreateToken(): string {
  const cookies = document.cookie.split("; ").reduce((acc, val) => {
    const [key, value] = val.split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  let token = cookies.token;
  if (!token) {
    token = uuidv4();
    console.log("Generated new token:", token);
    
    // Set cookie differently for localhost development
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const cookieString = isLocalhost 
      ? `token=${token}; path=/; SameSite=Lax`
      : `token=${token}; path=/; domain=.nighthub.pro; SameSite=Lax`;
    
    document.cookie = cookieString;
  }

  return token;
}
