import { execFile } from "child_process";
import util from "util";
const execFileAsync = util.promisify(execFile);

export async function checkICMP(target: string = "8.8.8.8"): Promise<any> {
    const results: any = {
        protocol: "icmp",
        checks: []
    };

    try {
        const start = Date.now();
        // Ping 1 packet, timeout 2 seconds
        // Detect OS for correct ping flags
        const isWin = process.platform === "win32";
        const cmd = "ping";
        const args = isWin 
            ? ["-n", "1", "-w", "2000", target]
            : ["-c", "1", "-W", "2", target];
            
        await execFileAsync(cmd, args);
        
        results.checks.push({
            name: "ping_target",
            target: target,
            status: "success",
            duration: Date.now() - start
        });
    } catch (e: any) {
        results.checks.push({
            name: "ping_target",
            target: target,
            status: "failed",
            error: "Timeout or Unreachable" // ping exits with non-zero on failure
        });
    }

    return results;
}