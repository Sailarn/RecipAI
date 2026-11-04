import type { Metadata } from "next";
import { ReviewSignIn } from "@/components/connector-auth/review-sign-in";
import { ExternalAuthIntlProvider } from "../intl-provider";

export const metadata: Metadata = {
  title: "RecipAI · Reviewer sign-in",
  robots: { index: false, follow: false },
};

// Hidden, unlinked sign-in for the AI-connector directory reviewers' account
// (email and password; sign-up is disabled). See
// docs/specs/claude-directory-listing.md.
export default function ReviewSignInPage() {
  return (
    <ExternalAuthIntlProvider locale="en">
      <ReviewSignIn />
    </ExternalAuthIntlProvider>
  );
}
