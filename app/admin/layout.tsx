export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-container" style={{ margin: 0, padding: 0, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {children}
    </div>
  );
}