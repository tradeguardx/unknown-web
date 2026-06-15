"use client";

// WhatsApp-Web-style shell for /connections. Desktop: persistent sidebar (left)
// + chat/placeholder (right). Mobile: single pane — list on /connections, chat on
// /connections/[id] (the sidebar hides, back-link returns to the list).

import { usePathname } from "next/navigation";
import { ConnectionsSidebar } from "@/components/match/ConnectionsSidebar";

export default function ConnectionsLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const onChat = /^\/connections\/[^/]+/.test(path); // a specific chat is open

  return (
    <div className="flex h-[100dvh] w-full">
      <aside
        className={`w-full lg:w-[30%] lg:flex-shrink-0 lg:border-r-2 border-ink ${
          onChat ? "hidden lg:flex lg:flex-col" : "flex flex-col"
        }`}
      >
        <ConnectionsSidebar />
      </aside>
      <main className={`flex-1 min-w-0 ${onChat ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
        {children}
      </main>
    </div>
  );
}
