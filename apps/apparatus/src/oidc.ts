import { Request, Response } from "express";
import * as jose from "jose";

// Store keys in memory
let keyPair: { publicKey: any; privateKey: any };
let jwks: any;

async function getKeys() {
    if (!keyPair) {
        const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
        keyPair = { publicKey, privateKey };
        
        const jwk = await jose.exportJWK(publicKey);
        jwk.kid = "simulated-key-id-1";
        jwk.use = "sig";
        jwk.alg = "RS256";
        
        jwks = {
            keys: [jwk]
        };
    }
    return { keyPair, jwks };
}

export async function jwksHandler(req: Request, res: Response) {
    const { jwks } = await getKeys();
    res.json(jwks);
}

export async function tokenMintHandler(req: Request, res: Response) {
    const { keyPair } = await getKeys();

    try {
        // Allow custom claims via body
        const customClaims = req.body || {};
        
        const jwt = await new jose.SignJWT({ 
            iss: "urn:apparatus:oidc",
            aud: "urn:apparatus:client",
            ...customClaims 
        })
        .setProtectedHeader({ alg: "RS256", kid: "simulated-key-id-1" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(keyPair.privateKey);

        res.json({
            access_token: jwt,
            token_type: "Bearer",
            expires_in: 3600
        });
    } catch (err: any) {
        res.status(500).json({ error: "Token generation failed", details: err.message });
    }
}

export function oidcDiscoveryHandler(req: Request, res: Response) {
    const proto = req.protocol;
    const host = req.get("host");
    const baseUrl = `${proto}://${host}`;

    res.json({
        issuer: "urn:apparatus:oidc",
        authorization_endpoint: `${baseUrl}/auth/authorize`, // Not implemented, just placeholder
        token_endpoint: `${baseUrl}/auth/token`,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        response_types_supported: ["token"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"]
    });
}
