import { BottomNav } from "@/components/bottom-nav";
import { Header } from "@/components/header";
import { DumpProcessingListener } from "@/components/dump-processing-listener";
import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { FirestoreRealtimeSync } from "@/components/firestore-realtime-sync";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <DumpProcessingListener />
      <FirestoreRealtimeSync />
      <ConfirmationDrawer />
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
