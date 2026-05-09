import type { Metadata } from "next";
import { ChatWindow } from "@/components/ChatWindow";

// /chat is the active chat session — no SEO value, and we don't want it
// indexed because the URL is stateless (chat content lives in client memory).
export const metadata: Metadata = {
  title: "chat",
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return <ChatWindow />;
}
