import { createRemoteJWKSet, jwtVerify } from "jose";
import { getConfig } from "../config.js";

let jwkSet = null;
let issuer = null;

async function getJwkSet() {
  const config = await getConfig();
  if (!jwkSet || !issuer) {
    issuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.cognitoUserPoolId}`;
    const jwksUri = new URL(`${issuer}/.well-known/jwks.json`);
    jwkSet = createRemoteJWKSet(jwksUri);
  }
  return { jwkSet, issuer };
}

export async function verifyToken(token) {
  const { jwkSet, issuer: expectedIssuer } = await getJwkSet();
  const config = await getConfig();

  const { payload } = await jwtVerify(token, jwkSet, {
    issuer: expectedIssuer,
    audience: config.cognitoClientId
  });

  return payload;
}
