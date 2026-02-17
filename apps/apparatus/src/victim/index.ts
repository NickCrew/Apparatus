import { Router, Request, Response } from "express";
import { logger } from "../logger.js";

const router = Router();

// --- 1. SQL Injection Victim ---
// Mock Database
const USERS = [
    { id: 1, user: "admin", pass: "supersecret", role: "admin" },
    { id: 2, user: "guest", pass: "guest", role: "user" }
];

router.get("/login", (req, res) => {
    const user = req.query.user as string || "";
    const pass = req.query.pass as string || "";

    logger.info({ user, ip: req.ip }, "Victim: Login Attempt");

    // VULNERABILITY: Naive string matching simulating SQLi
    // If the user inputs "admin' --", this logic is "bypassed" by our naive parser below.
    // Actually, properly simulating SQLi without a DB engine is hard. 
    // Let's rely on the Logic: if the input contains specific bypass patterns, we allow it.
    
    let loggedIn = false;
    let foundUser = null;

    // Simulating: SELECT * FROM users WHERE user = '$user' AND pass = '$pass'
    
    // The "Bypass" Check (Simulating the SQL Engine)
    if (user.includes("' OR '1'='1") || user.includes("' OR 1=1")) {
        loggedIn = true;
        foundUser = USERS[0]; // Admin
        logger.warn({ ip: req.ip }, "Victim: SQL Injection Successful!");
    } else {
        // Normal Check
        foundUser = USERS.find(u => u.user === user && u.pass === pass);
        if (foundUser) loggedIn = true;
    }

    if (loggedIn) {
        res.json({ status: "success", msg: "Welcome back!", role: foundUser?.role, flag: "FLAG{SQLI_IS_DEAD_LONG_LIVE_SQLI}" });
    } else {
        res.status(401).json({ status: "failed", error: "Invalid credentials" });
    }
});

// --- 2. Remote Code Execution (RCE) Victim ---
router.get("/calc", (req, res) => {
    const eq = req.query.eq as string;
    if (!eq) return res.status(400).send("Missing 'eq' param");

    logger.info({ eq, ip: req.ip }, "Victim: Calc Request");

    try {
        // VULNERABILITY: Direct eval()
        // Attack: /victim/calc?eq=require('child_process').execSync('ls').toString()
        const result = eval(eq); 
        res.send(`Result: ${result}`);
    } catch (e: any) {
        res.status(500).send(`Error: ${e.message}`);
    }
});

// --- 3. Reflected XSS Victim ---
router.get("/guestbook", (req, res) => {
    const msg = req.query.msg as string || "Hello!";
    
    // VULNERABILITY: No sanitization
    res.send(`
        <h1>Victim Guestbook</h1>
        <p>Message: ${msg}</p>
        <hr>
        <form action="/victim/guestbook">
            <input name="msg" placeholder="Leave a message...">
            <button>Sign</button>
        </form>
    `);
});

export const victimRouter = router;
