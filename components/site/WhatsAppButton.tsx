import { MessageCircle } from "lucide-react";

export function WhatsAppButton({ number }: { number?: string | null }) {
  if (!number) return null;
  const digits = number.replace(/[^\d]/g, "");
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105 md:bottom-5"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
