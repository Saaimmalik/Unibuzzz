import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { CommunitiesPage } from "./pages/CommunitiesPage";
import { CommunityPage } from "./pages/CommunityPage";
import { ConversationPage } from "./pages/ConversationPage";
import { CoursePage } from "./pages/CoursePage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { ListingPage } from "./pages/ListingPage";
import { LoginPage } from "./pages/LoginPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { MessagesPage } from "./pages/MessagesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PostPage } from "./pages/PostPage";
import { ProfessorPage } from "./pages/ProfessorPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ReviewsPage } from "./pages/ReviewsPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SignUpPage } from "./pages/SignUpPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { CookiePolicyPage } from "./pages/legal/CookiePolicyPage";
import { PrivacyPolicyPage } from "./pages/legal/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/legal/TermsOfServicePage";
import { BlockedUsersPage } from "./pages/settings/BlockedUsersPage";
import { ChangePasswordPage } from "./pages/settings/ChangePasswordPage";
import { EmailPreferencesPage } from "./pages/settings/EmailPreferencesPage";
import { PrivacySettingsPage } from "./pages/settings/PrivacySettingsPage";

// Lazy-loaded so none of the admin dashboard's code ships in the bundle a
// regular student downloads — the only deviation from this file's otherwise
// eager routing, scoped deliberately to just this tree.
const AdminLayout = lazy(() =>
  import("./components/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const AdminOverviewPage = lazy(() =>
  import("./pages/admin/AdminOverviewPage").then((m) => ({ default: m.AdminOverviewPage })),
);
const AdminUsersPage = lazy(() =>
  import("./pages/admin/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })),
);
const AdminContentPage = lazy(() =>
  import("./pages/admin/AdminContentPage").then((m) => ({ default: m.AdminContentPage })),
);
const AdminReviewsPage = lazy(() =>
  import("./pages/admin/AdminReviewsPage").then((m) => ({ default: m.AdminReviewsPage })),
);
const AdminReportsPage = lazy(() =>
  import("./pages/admin/AdminReportsPage").then((m) => ({ default: m.AdminReportsPage })),
);
const AdminMarketplacePage = lazy(() =>
  import("./pages/admin/AdminMarketplacePage").then((m) => ({ default: m.AdminMarketplacePage })),
);
const AdminCommunitiesPage = lazy(() =>
  import("./pages/admin/AdminCommunitiesPage").then((m) => ({ default: m.AdminCommunitiesPage })),
);
const AdminAcademicsPage = lazy(() =>
  import("./pages/admin/AdminAcademicsPage").then((m) => ({ default: m.AdminAcademicsPage })),
);
const AdminAuditLogPage = lazy(() =>
  import("./pages/admin/AdminAuditLogPage").then((m) => ({ default: m.AdminAuditLogPage })),
);
const AdminFeedbackPage = lazy(() =>
  import("./pages/admin/AdminFeedbackPage").then((m) => ({ default: m.AdminFeedbackPage })),
);

function AdminSuspense() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-stone-400">Loading…</p>}>
      <AdminLayout />
    </Suspense>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminRoute />}>
          <Route element={<AdminSuspense />}>
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/content" element={<AdminContentPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/marketplace" element={<AdminMarketplacePage />} />
            <Route path="/admin/communities" element={<AdminCommunitiesPage />} />
            <Route path="/admin/academics" element={<AdminAcademicsPage />} />
            <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
            <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
          </Route>
        </Route>

        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/posts/:postId" element={<PostPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/c/:slug" element={<CommunityPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:id" element={<ListingPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/reviews/professors/:slug" element={<ProfessorPage />} />
          <Route path="/reviews/courses/:slug" element={<CoursePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<ConversationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/change-password" element={<ChangePasswordPage />} />
          <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
          <Route path="/settings/blocked-users" element={<BlockedUsersPage />} />
          <Route path="/settings/email-preferences" element={<EmailPreferencesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/u/:username" element={<PublicProfilePage />} />
        </Route>
      </Route>

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Reachable whether signed in or not — linked from Profile and from
          the signup form, neither of which should require an active
          session. */}
      <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/legal/cookies" element={<CookiePolicyPage />} />
      <Route path="/legal/terms" element={<TermsOfServicePage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
