import { LegalLayout, LegalSection } from "../../components/LegalLayout";
import {
  LEGAL_COMPANY_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_REGISTERED_ADDRESS,
  LEGAL_WEBSITE,
} from "./legalInfo";

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate={LEGAL_EFFECTIVE_DATE}>
      <p>
        {LEGAL_COMPANY_NAME} ("<strong>Sanfi Technologies</strong>", "<strong>we</strong>", "
        <strong>us</strong>", or "<strong>our</strong>") operates UniBuzzz ({LEGAL_WEBSITE}), a
        university-only social platform. This Privacy Policy explains what personal data we collect,
        why, how it's used and protected, and the choices and rights you have over it.
      </p>
      <p>
        UniBuzzz is only available to verified students of participating universities. By creating
        an account, you agree to the collection and use of your information as described here.
      </p>

      <LegalSection heading="1. Who we are">
        <p>
          {LEGAL_COMPANY_NAME} is the data controller for personal data processed through UniBuzzz.
        </p>
        <p>
          Registered address: {LEGAL_REGISTERED_ADDRESS}
          <br />
          Contact:{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-brand-purple underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="2. Information we collect">
        <p>
          <strong>Account information.</strong> Your university email address, username, display
          name, password (stored as a salted hash by our authentication provider — we never see or
          store it in plain text), and profile details you add such as bio, degree/programme,
          graduation year, and profile photo.
        </p>
        <p>
          <strong>Content you create.</strong> Posts, comments, photos, community posts, direct
          messages, marketplace listings, professor/course reviews and ratings, and any reports or
          feedback you submit.
        </p>
        <p>
          <strong>Usage and device information.</strong> Basic technical data such as your
          approximate activity timestamps, device/browser type, and app install/notification
          preferences, collected automatically to keep the service secure and working correctly.
        </p>
        <p>
          <strong>Communications.</strong> If you contact us (e.g. a support request, bug report, or
          feature request), we keep a record of that correspondence.
        </p>
      </LegalSection>

      <LegalSection heading="3. How we use your information">
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and secure your account, and verify your university email.</li>
          <li>
            To operate core features: the feed, communities, messaging, marketplace, and reviews.
          </li>
          <li>
            To send you transactional and, where you've opted in, activity emails (see our{" "}
            <a href="/legal/cookies" className="text-brand-purple underline">
              Cookie Policy
            </a>{" "}
            and the Email Preferences section of Settings for full control over these).
          </li>
          <li>
            To detect, investigate, and act on reports of abuse, harassment, spam, or policy
            violations.
          </li>
          <li>To respond to support requests, bug reports, and feature requests.</li>
          <li>To maintain the security, integrity, and reliability of the platform.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Who can see your information">
        <p>
          UniBuzzz is scoped to your university: your profile and public content are visible only to
          verified students within your own university, never across universities.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Posts, comments, and marketplace listings are visible to other students at your
            university, subject to community membership rules and anything you mark anonymous.
          </li>
          <li>Direct messages are visible only to the participants in that conversation.</li>
          <li>
            Professor/course reviews are always posted anonymously — other students never see who
            wrote a review. Our moderation team can access reviewer identity only to enforce content
            policy (e.g. investigating harassment or spam).
          </li>
          <li>
            Content you mark "posted anonymously" hides your name/photo from other students on that
            specific post or comment.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Sharing with third parties">
        <p>We do not sell your personal data. We share data only with:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Service providers</strong> who host and run UniBuzzz on our behalf under
            contractual confidentiality and data-protection obligations — currently Supabase
            (database, authentication, file storage, and realtime infrastructure) and Resend
            (transactional email delivery).
          </li>
          <li>
            Other users, only to the extent your own settings and actions make content visible to
            them (see Section 4).
          </li>
          <li>
            Law enforcement or regulators, if we're legally required to, or to protect the safety of
            our users.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Data retention">
        <p>
          We keep your data for as long as your account is active. If you deactivate your account,
          your profile and content are hidden from other students but retained so you can reactivate
          simply by logging back in.
        </p>
        <p>
          If you delete your account, we immediately anonymize your profile (your name, username,
          email, bio, and photo are replaced with generic placeholders) and permanently block the
          account from logging in again. Content you authored (posts, comments, reviews, listings)
          remains on the platform, attributed to "Deleted User", for the integrity of conversations
          and the community — we do not retain a way to re-link it back to you. Some records (e.g.
          moderation and audit logs) may be retained longer where needed for legal, safety, or
          accountability reasons.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          If you're in the EU/EEA or UK, you have rights under GDPR including the right to access,
          correct, delete, or export your data, and to object to or restrict certain processing. You
          can exercise most of these directly from Settings on UniBuzzz:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Access &amp; export</strong> — download a copy of your data at any time from
            Settings → Download my data.
          </li>
          <li>
            <strong>Correction</strong> — edit your profile information directly from your Profile.
          </li>
          <li>
            <strong>Deletion</strong> — deactivate or permanently delete your account from Settings
            → Account.
          </li>
          <li>
            <strong>Objection/complaints</strong> — contact us at{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-brand-purple underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
            , or lodge a complaint with your local data protection authority (in Ireland, the Data
            Protection Commission).
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. Data security">
        <p>
          We use industry-standard safeguards including encryption in transit, database-level access
          controls (row-level security scoped to your own university and account), and restricted
          staff access to moderation tools. No method of transmission or storage is 100% secure, but
          we work to protect your information appropriately.
        </p>
      </LegalSection>

      <LegalSection heading="9. Children's privacy">
        <p>
          UniBuzzz is intended for verified university students and is not directed at children
          under 16. We do not knowingly collect data from anyone who does not hold a valid,
          verifiable university email address.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we'll
          notify you via the app or by email before they take effect. Continued use of UniBuzzz
          after changes take effect means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact us">
        <p>
          Questions about this policy or your data? Contact {LEGAL_COMPANY_NAME} at{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-brand-purple underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          or {LEGAL_REGISTERED_ADDRESS}.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
