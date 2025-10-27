import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
