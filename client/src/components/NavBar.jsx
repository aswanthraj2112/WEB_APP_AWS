import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function NavBar() {
  const { user, signOut, groups } = useAuth();
  const isAdmin = groups.includes("admins");

  return (
    <header className="navbar">
      <Link to="/">
        <h1>Cloud Video Studio</h1>
      </Link>
      <nav className="nav-links">
        {user && (
          <>
            <NavLink to="/upload">Upload</NavLink>
            <NavLink to="/videos">My Videos</NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
            <button className="button-secondary" onClick={signOut}>
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
