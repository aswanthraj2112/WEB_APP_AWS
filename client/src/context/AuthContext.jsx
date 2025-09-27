import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Amplify, Auth } from "aws-amplify";
import { jwtDecode } from "jwt-decode";
import { getAwsConfig } from "../awsConfig.js";

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
  const [amplifyReady, setAmplifyReady] = useState(false);
  const configurePromiseRef = useRef(null);

  const ensureAmplify = useCallback(async () => {
    if (amplifyReady) {
      return;
    }

    if (!configurePromiseRef.current) {
      configurePromiseRef.current = (async () => {
        try {
          const config = await getAwsConfig();
          Amplify.configure(config);
          if (config.Auth) {
            Auth.configure(config.Auth);
          }
          setAmplifyReady(true);
        } catch (err) {
          console.error("Failed to configure Amplify", err);
          setError(err);
          throw err;
        } finally {
          configurePromiseRef.current = null;
        }
      })();
    }

    return configurePromiseRef.current;
  }, [amplifyReady]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await ensureAmplify();
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
        if (err?.message && err.message !== "No current user") {
          console.error("Failed to restore user session", err);
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [ensureAmplify]);

  const signIn = async (username, password) => {
    setError(null);
    await ensureAmplify();
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
    await ensureAmplify();
    return Auth.signUp({
      username,
      password,
      attributes: { email }
    });
  };

  const confirmSignUp = async (username, code) => {
    await ensureAmplify();
    return Auth.confirmSignUp(username, code);
  };

  const signOut = async () => {
    await ensureAmplify();
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
