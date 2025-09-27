export function Toast({ message, type = "info" }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <strong>{type === "error" ? "Error" : "Status"}:</strong> {message}
    </div>
  );
}
