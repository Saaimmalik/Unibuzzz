import { useQuery } from "@tanstack/react-query";
import { Flag, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { useStartConversation } from "../features/messaging/hooks";
import { ReportDialog } from "../features/reports/ReportDialog";
import { fetchUserByUsername } from "../features/search/api";
import { useAuth } from "../lib/auth-context";

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const startConversation = useStartConversation();
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-by-username", username],
    queryFn: () => fetchUserByUsername(username!),
    enabled: !!username,
  });

  if (username && appUser?.username === username) return <Navigate to="/profile" replace />;
  if (isLoading) return <p className="py-10 text-center text-sm text-stone-400">Loading…</p>;
  if (!user) return <p className="py-10 text-center text-sm text-stone-400">User not found.</p>;

  async function handleMessage() {
    setMessageError(null);
    try {
      const conversationId = await startConversation.mutateAsync(user!.id);
      navigate(`/messages/${conversationId}`);
    } catch {
      setMessageError("Couldn't start a conversation. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center gap-4">
        <Avatar displayName={user.display_name} avatarUrl={user.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-brand-ink">{user.display_name}</h1>
          <p className="text-sm text-stone-500">@{user.username}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleMessage}
            disabled={startConversation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-orange disabled:opacity-60"
          >
            <MessageCircle size={16} />
            Message
          </button>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Report user"
          >
            <Flag size={16} />
          </button>
        </div>
      </div>

      {messageError && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {messageError}
        </p>
      )}

      {showReport && (
        <ReportDialog targetType="user" targetId={user.id} onClose={() => setShowReport(false)} />
      )}

      <dl className="mt-8 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        <div className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-stone-500">Degree</dt>
          <dd className="font-medium text-brand-ink">{user.degree ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
