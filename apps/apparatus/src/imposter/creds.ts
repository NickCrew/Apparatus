import { randomBytes } from "crypto";

export interface AWSCredentials {
    AccessKeyId: string;
    SecretAccessKey: string;
    Token: string;
    Expiration: string;
}

export function generateAwsCreds(roleName: string = "imposter-role"): AWSCredentials {
    // Generate realistic-looking fake AWS keys
    const accessKey = "AKIA" + randomBytes(16).toString("hex").toUpperCase().substring(0, 16);
    const secretKey = randomBytes(32).toString("base64");
    const token = randomBytes(128).toString("base64");
    
    // Expire in 6 hours
    const expiration = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    return {
        AccessKeyId: accessKey,
        SecretAccessKey: secretKey,
        Token: token,
        Expiration: expiration
    };
}
