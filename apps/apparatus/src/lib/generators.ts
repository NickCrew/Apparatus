// Mock generators for DLP testing
function generateLuhn(prefix: string, length: number): string {
    let payload = prefix;
    while (payload.length < length - 1) payload += Math.floor(Math.random() * 10);

    const digits = payload.split("").map(Number);
    let sum = 0;
    let shouldDouble = true;
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = digits[i];
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return payload + checkDigit;
}

export const generators = {
    cc: () => {
        // 16-digit Visa-like (starts with 4) with valid Luhn checksum.
        return generateLuhn("4", 16);
    },
    ssn: () => {
        // Generate a valid-looking SSN
        const area = Math.floor(Math.random() * 900) + 100;
        const group = Math.floor(Math.random() * 90) + 10;
        const serial = Math.floor(Math.random() * 9000) + 1000;
        return `${area}-${group}-${serial}`;
    },
    email: () => {
        // Generate a random email
        const domains = ["example.com", "test.org", "corp.net"];
        const users = ["alice", "bob", "charlie", "admin", "support"];
        const user = users[Math.floor(Math.random() * users.length)];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        return `${user}@${domain}`;
    }
};
