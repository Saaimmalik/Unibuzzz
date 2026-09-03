import { LegalLayout, LegalSection } from "../../components/LegalLayout";
import {
  LEGAL_COMPANY_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_REGISTERED_ADDRESS,
} from "./legalInfo";

export function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate={LEGAL_EFFECTIVE_DATE}>
      <p>
        These Terms of Service ("<strong>Terms</strong>") govern your access to and use of UniBuzzz,
        provided by {LEGAL_COMPANY_NAME} ("<strong>Sanfi Technologies</strong>", "
        <strong>we</strong>", "<strong>us</strong>"). By creating an account or using UniBuzzz, you
        agree to these Terms. If you don't agree, please don't use UniBuzzz.
      </p>

      <LegalSection heading="1. Eligibility">
        <p>
          UniBuzzz is available only to current students of participating universities who can
          verify a valid university email address. You must be at least 16 years old to use
          UniBuzzz. You're responsible for keeping your account credentials confidential and for all
          activity under your account.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your content">
        <p>
          You retain ownership of the posts, comments, photos, listings, reviews, and other content
          you submit ("<strong>User Content</strong>"). By posting User Content, you grant{" "}
          {LEGAL_COMPANY_NAME} a non-exclusive, worldwide, royalty-free licence to host, store,
          display, and distribute it within UniBuzzz for the purpose of operating the service.
        </p>
        <p>
          You're solely responsible for your User Content and confirm you have the right to post it.
          Some content types (posts, comments, messages, listings, reviews) cannot be edited after
          posting on UniBuzzz — only removed — this is a deliberate platform design, not a bug.
        </p>
      </LegalSection>

      <LegalSection heading="3. Acceptable use">
        <p>You agree not to use UniBuzzz to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Harass, bully, threaten, or defame another person.</li>
          <li>Post hate speech, discriminatory content, or content that incites violence.</li>
          <li>Share another person's private/personal information without consent (doxxing).</li>
          <li>Post spam, scams, or unauthorized advertising.</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation with anyone.</li>
          <li>Post reviews or content you know to be false, or written in bad faith.</li>
          <li>
            Attempt to access another user's account, or interfere with the security or operation of
            UniBuzzz.
          </li>
          <li>
            Use UniBuzzz for any activity outside your own university community that it isn't
            intended for.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Marketplace">
        <p>
          UniBuzzz's Marketplace lets students list and message each other about items for sale.{" "}
          {LEGAL_COMPANY_NAME} is not a party to any transaction between buyers and sellers, does
          not verify listings, and is not responsible for the quality, safety, or legality of items
          listed, or for any dispute between users. Trade at your own discretion — meet in safe,
          public locations where possible.
        </p>
      </LegalSection>

      <LegalSection heading="5. Reviews">
        <p>
          Professor and course reviews must reflect your genuine experience. Reviews containing
          harassment, personal information, spam, or content unrelated to the professor/course may
          be removed and repeated abuse may result in account action. Reviews are posted anonymously
          to other students, but {LEGAL_COMPANY_NAME} retains the ability to identify the author
          internally for moderation purposes.
        </p>
      </LegalSection>

      <LegalSection heading="6. Moderation &amp; enforcement">
        <p>
          We may review, remove, or restrict access to content that violates these Terms, and may
          suspend or ban accounts for serious or repeated violations. Where content is removed by a
          moderator or hidden through the reporting system, we'll let you know via a notification.
          You can report content or users you believe violate these Terms directly within the app,
          or contact us at{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-brand-purple underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="7. Account deactivation &amp; deletion">
        <p>
          You can deactivate your account at any time from Settings — this hides your profile and
          content from other students, and simply logging back in reactivates it. You can also
          permanently delete your account, which anonymizes your profile and blocks the account from
          logging in again; content you authored remains on the platform attributed to "Deleted
          User" so conversations and community context stay intact. We may also suspend or terminate
          your access if you violate these Terms.
        </p>
      </LegalSection>

      <LegalSection heading="8. Intellectual property">
        <p>
          The UniBuzzz name, logo, and branding are the property of {LEGAL_COMPANY_NAME}. You may
          not use them without our prior written permission. All rights not expressly granted to you
          are reserved.
        </p>
      </LegalSection>

      <LegalSection heading="9. Disclaimers">
        <p>
          UniBuzzz is provided "as is" and "as available", without warranties of any kind, express
          or implied. We do not guarantee the accuracy of reviews, listings, or any other User
          Content, and we are not responsible for the conduct of any user, on or off the platform.
        </p>
      </LegalSection>

      <LegalSection heading="10. Limitation of liability">
        <p>
          To the fullest extent permitted by law, {LEGAL_COMPANY_NAME} shall not be liable for any
          indirect, incidental, special, or consequential damages arising from your use of UniBuzzz,
          or from any interaction, transaction, or dispute between users.
        </p>
      </LegalSection>

      <LegalSection heading="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make material changes, we'll notify you
          via the app or by email before they take effect. Continued use of UniBuzzz after changes
          take effect means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="12. Governing law">
        <p>
          These Terms are governed by the laws of Ireland, without regard to its conflict of law
          principles. Any disputes will be subject to the exclusive jurisdiction of the courts of
          Ireland.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact us">
        <p>
          Questions about these Terms? Contact {LEGAL_COMPANY_NAME} at{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-brand-purple underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          or {LEGAL_REGISTERED_ADDRESS}.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
