import { Request, Response } from "express";
import { generators } from "./lib/generators.js";

export { generators };

export function dlpHandler(req: Request, res: Response) {
    const type = req.query.type as string;
    
    if (type === "cc") {
        // Generate valid Visa-like number (starts with 4, 16 digits)
        const cc = generators.cc();
        return res.json({
            type: "Credit Card", 
            value: cc, 
            description: "Valid Luhn checksum",
            pattern: "\\d{16}"
        });
    }
    
    if (type === "ssn") {
        const ssn = generators.ssn();
        return res.json({
            type: "SSN", 
            value: ssn,
            description: "US Social Security Number format"
        });
    }

    if (type === "email") {
         return res.json({
             type: "Email List",
             values: generators.email().split(",")
         });
    }

    if (type === "sql") {
        // Return a fake SQL error that WAFs often mask
        res.status(500);
        res.set("Content-Type", "text/html");
        return res.send("<html><body><h1>Database Error</h1><p>You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'DROP TABLE users' at line 1</p></body></html>");
    }

    res.status(400).json({
        error: "Unknown Type", 
        available_types: ["cc", "ssn", "email", "sql"]
    });
}