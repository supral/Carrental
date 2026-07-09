import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import StickyActionButtons from "@/components/StickyActionButtons";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <StickyActionButtons />
    </div>
  );
}
