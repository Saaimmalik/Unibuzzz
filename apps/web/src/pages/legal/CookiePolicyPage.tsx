import { LegalLayout, LegalSection } from "../../components/LegalLayout";
import { LEGAL_COMPANY_NAME, LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE } from "./legalInfo";

export function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy" effectiveDate={LEGAL_EFFECTIVE_DATE}>
      <p>
        This Cookie Policy explains how {LEGAL_COMPANY_NAME} uses cookies and similar local storage
        technologies on UniBuzzz, and the choices you have over them.
      </p>

      <LegalSection heading="1. We don't use tracking or advertising cookies">
        <p>
          UniBuzzz doesn't run ads and doesn't use third-party analytics or advertising cookies to
          track you across the web. We don't sell data to advertisers, and we don't need consent
          banners for cross-site tracking because we don't do any.
        </p>
      </LegalSection>

      <LegalSection heading="2. What we do use">
        <p>
          UniBuzzz is a Progressive Web App and instead relies mainly on your browser's local
          storage and, where your browser supports it, a small number of first-party cookies — both
          only readable by unibuzzz.com, never by third parties:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Authentication ("strictly necessary").</strong> Used to keep you securely signed
            in between visits. Without this, you'd have to log in again on every page load.
          </li>
          <li>
            <strong>Preferences (local storage).</strong> Remembers your chosen appearance
            (Light/Dark/System) and whether you've dismissed the "Install UniBuzzz" prompt, so we
            don't ask again every visit.
          </li>
          <li>
            <strong>Offline &amp; performance (service worker cache).</strong> UniBuzzz can be
            installed to your home screen and caches app assets and recently viewed content on your
            device so the app loads faster and still shows something useful with a weak or no
            connection.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Managing cookies and local storage">
        <p>
          Because none of the above is used for advertising or cross-site tracking, there's no
          separate consent banner — using UniBuzzz with these enabled is necessary for the app to
          function. You can still clear cookies and site data for unibuzzz.com at any time from your
          browser settings; doing so will sign you out and reset your saved preferences, but won't
          affect your account or content.
        </p>
      </LegalSection>

      <LegalSection heading="4. Changes to this policy">
        <p>
          If the technologies we use change (for example, if we introduce analytics in the future),
          we'll update this page and, where required by law, ask for your consent first.
        </p>
      </LegalSection>

      <LegalSection heading="5. Contact us">
        <p>
          Questions about this Cookie Policy? Contact us at{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-brand-purple underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
