export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  userPoolWebClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  mandatorySignIn: true,
  oauth: {
    domain: import.meta.env.VITE_COGNITO_DOMAIN || undefined,
    scope: ["email", "openid", "profile"],
    redirectSignIn: window.location.origin,
    redirectSignOut: window.location.origin,
    responseType: "code"
  }
};
