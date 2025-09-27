import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp, confirmSignUp, error, setError } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    code: ""
  });
  const [pendingUsername, setPendingUsername] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/videos");
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    try {
      await signIn(form.username, form.password);
      navigate("/videos");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    try {
      await signUp({ username: form.username, password: form.password, email: form.email });
      setPendingUsername(form.username);
      setMode("confirm");
      setMessage("Verification code sent. Please check your email.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    try {
      const username = pendingUsername || form.username;
      await confirmSignUp(username, form.code);
      setMode("signin");
      setMessage("Account confirmed. You can now sign in.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="main-content">
      <div className="card auth-card">
        <h2 style={{ marginBottom: "1rem" }}>
          {mode === "signin" && "Sign In"}
          {mode === "signup" && "Create an Account"}
          {mode === "confirm" && "Confirm Sign Up"}
        </h2>

        <Toast message={error || message} type={error ? "error" : "info"} />

        {mode === "signin" && (
          <form onSubmit={handleSignIn}>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" value={form.username} onChange={handleChange} required />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
            <button className="button-primary" type="submit">
              Sign In
            </button>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignUp}>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" value={form.username} onChange={handleChange} required />
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
            <button className="button-primary" type="submit">
              Sign Up
            </button>
          </form>
        )}

        {mode === "confirm" && (
          <form onSubmit={handleConfirm}>
            <p>Enter the verification code sent to your email.</p>
            <label htmlFor="code">Verification Code</label>
            <input id="code" name="code" value={form.code} onChange={handleChange} required />
            <button className="button-primary" type="submit">
              Confirm Account
            </button>
          </form>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          {mode === "signin" && (
            <p>
              New here?{" "}
              <button className="button-secondary" onClick={() => setMode("signup")}>Sign Up</button>
            </p>
          )}
          {mode === "signup" && (
            <p>
              Already have an account?{" "}
              <button className="button-secondary" onClick={() => setMode("signin")}>Sign In</button>
            </p>
          )}
          {mode === "confirm" && (
            <p>
              Need to try again?{" "}
              <button className="button-secondary" onClick={() => setMode("signin")}>Back to Sign In</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
