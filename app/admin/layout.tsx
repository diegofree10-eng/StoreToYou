export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-container">
      {children}
    </div>
  );
}