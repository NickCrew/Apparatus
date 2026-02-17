/**
 * Safely stringify an object to JSON, handling circular references and depth limits.
 */
export function safeStringify(obj: any, depth: number = 10): string {
    const cache = new Set();
    
    const replacer = (key: string, value: any) => {
        if (typeof value === "object" && value !== null) {
            if (cache.has(value)) {
                return "[Circular]";
            }
            cache.add(value);
        }
        
        // Handle BigInt which JSON.stringify doesn't like
        if (typeof value === "bigint") {
            return value.toString();
        }
        
        return value;
    };

    try {
        return JSON.stringify(obj, replacer);
    } catch (err) {
        return `{"error": "Failed to stringify object", "message": "${err instanceof Error ? err.message : String(err)}"}`;
    }
}
