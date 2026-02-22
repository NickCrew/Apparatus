/**
 * CyberChef Integration Utility
 * Generates deep links to CyberChef with pre-filled input and recipes.
 */

const CYBERCHEF_URL = 'https://gchq.github.io/CyberChef/';

export interface CyberChefRecipe {
  op: string;
  args: any[];
}

/**
 * Encodes input data for CyberChef URL
 */
function encodeInput(data: string | object): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  // CyberChef expects base64 encoded input in the URL
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Generates a CyberChef deep link
 */
export function generateCyberChefUrl(data: unknown, recipes: CyberChefRecipe[] = []): string {
  const params = new URLSearchParams();
  
  // Normalize data shape
  let inputStr = '';
  if (data === null || data === undefined) {
    inputStr = '';
  } else if (typeof data === 'string') {
    inputStr = data;
  } else {
    // Handle TrafficEvent (with id) vs plain Record
    // If it's a traffic event, we probably only want the body or path?
    // For now, dumping the whole object is safe if we trust the user.
    inputStr = JSON.stringify(data, null, 2);
  }

  if (inputStr) {
    params.set('input', encodeInput(inputStr));
  }
  
  if (recipes.length > 0) {
    // CyberChef recipe format in URL is a bit specific, usually Base64 of the JSON or just the JSON
    // Standard approach is to use the 'recipe' param
    params.set('recipe', JSON.stringify(recipes));
  }

  return `${CYBERCHEF_URL}#${params.toString()}`;
}

export function openInCyberChef(data: unknown, recipes: CyberChefRecipe[] = []): void {
  if (!confirm("⚠️ Privacy Warning\n\nYou are about to send this data to a public CyberChef instance (gchq.github.io). Do not proceed if this payload contains sensitive secrets, PII, or real credentials.\n\nContinue analysis?")) {
    return;
  }
  
  const url = generateCyberChefUrl(data, recipes);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Common security-focused recipes
 */
export const PRESET_RECIPES = {
  BAKED: [], // Just open the input
  FROM_BASE64: [{ op: 'From Base64', args: ['A-Za-z0-9+/=', true, false] }],
  URL_DECODE: [{ op: 'URL Decode', args: [] }],
  JSON_BEAUTIFY: [{ op: 'JSON Beutify', args: ['    ', false, true] }],
  DEFLATE: [{ op: 'Zlib Inflate', args: [0, 0, 'Adaptive', false, false] }],
};
