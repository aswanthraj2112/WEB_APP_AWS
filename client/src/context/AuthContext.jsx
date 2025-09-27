import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Amplify, Auth } from "aws-amplify";
import { jwtDecode } from "jwt-decode";
import { awsConfig } from "../awsConfig.js";

Amplify.configure({ Auth: awsConfig });

const AuthContext = createContext();

function extractGroups(idToken) {
  if (!idToken) return [];
  const payload = jwtDecode(idToken);
  const groups = payload["cognito:groups"];
  if (!groups) return [];
  if (Array.isArray(groups)) return groups;
  if (typeof groups === "string") return groups.split(",");
  return [];
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await Auth.currentSession();
        const currentUser = await Auth.currentAuthenticatedUser();
        const idToken = session.getIdToken().getJwtToken();
        const accessToken = session.getAccessToken().getJwtToken();
        setTokens({ idToken, accessToken });
        setUser({
          username: currentUser.getUsername(),
          attributes: currentUser.attributes
        });
      } catch (err) {
        setUser(null);
        setTokens(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const signIn = async (username, password) => {
    setError(null);
    await Auth.signIn({ username, password });
    const session = await Auth.currentSession();
    const currentUser = await Auth.currentAuthenticatedUser();
    const idToken = session.getIdToken().getJwtToken();
    const accessToken = session.getAccessToken().getJwtToken();
    setTokens({ idToken, accessToken });
    setUser({
      username: currentUser.getUsername(),
      attributes: currentUser.attributes
    });
  };

  const signUp = async ({ username, password, email }) => {
    setError(null);
    return Auth.signUp({
      username,
      password,
      attributes: { email }
    });
  };

  const confirmSignUp = (username, code) => Auth.confirmSignUp(username, code);

  const signOut = async () => {
    await Auth.signOut();
    setUser(null);
    setTokens(null);
  };

  const groups = useMemo(() => extractGroups(tokens?.idToken), [tokens]);

  const value = useMemo(
    () => ({
      user,
      tokens,
      loading,
      error,
      groups,
      signIn,
      signOut,
      signUp,
      confirmSignUp,
      setError
    }),
    [user, tokens, loading, error, groups]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
