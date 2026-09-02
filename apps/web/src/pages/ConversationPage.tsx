import { zodResolver } from "@hookform/resolvers/zod";
import { formatRelativeTime, sendMessageSchema, type SendMessageInput } from "@unibuzzz/shared";
import { ArrowLeft, Flag, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useMessages, useSendMessage } from "../features/messaging/hooks";
import { ReportDialog } from "../features/reports/ReportDialog";

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { appUser } = useAuth();
  const { data: messages, isLoading } = useMessages(conversationId ?? "");
  const sendMessage = useSendMessage(conversationId ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SendMessageInput>({ resolver: zodResolver(sendMessageSchema) });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function onSubmit(values: SendMessageInput) {
    await sendMessage.mutateAsync(values.body);
    reset();
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-xl flex-col px-4 py-4 md:h-[calc(100dvh-2rem)]">
      <div className="mb-3 flex items-center gap-2">
        <Link to="/messages" className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold text-brand-ink">Conversation</h1>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4">
        {isLoading && <p className="text-center text-sm text-stone-400">Loading…</p>}
        {messages?.map((message) => {
          const isMine = message.sender_id === appUser?.id;
          return (
            <div
              key={message.id}
              className={`group flex items-end gap-1 ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? "bg-brand-yellow text-black" : "bg-stone-100 text-brand-ink"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p
                  className={`mt-0.5 text-[10px] ${isMine ? "text-brand-ink/60" : "text-stone-400"}`}
                >
                  {formatRelativeTime(message.created_at)}
                </p>
              </div>
              {!isMine && (
                <button
                  type="button"
                  onClick={() => setReportingMessageId(message.id)}
                  className="shrink-0 rounded-full p-1 text-stone-300 opacity-0 hover:bg-stone-100 hover:text-stone-500 group-hover:opacity-100"
                  aria-label="Report message"
                >
                  <Flag size={13} />
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {reportingMessageId && (
        <ReportDialog
          targetType="message"
          targetId={reportingMessageId}
          onClose={() => setReportingMessageId(null)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="Write a message…"
          className="w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
          {...register("body")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex shrink-0 items-center justify-center rounded-full bg-brand-yellow p-2.5 text-black hover:bg-brand-orange disabled:opacity-60"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
