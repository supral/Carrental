import { Suspense } from "react";
import AdminLoginPage from "./LoginClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AdminLoginPage />
    </Suspense>
  );
}
