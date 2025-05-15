import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header isLoggedIn={true} />
      <main className="container mx-auto py-6">{children}</main>
    </>
  );
} 