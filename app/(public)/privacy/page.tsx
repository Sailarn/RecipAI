import type { Metadata } from "next";
import { DocList, DocSection, PublicDoc } from "@/components/public-doc";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy policy · RecipAI",
  description:
    "What RecipAI collects, why, who processes it, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <PublicDoc title="Privacy policy" updated="November 4, 2026">
      <p>
        RecipAI is a personal recipe app: it saves recipes you import from
        links, photos or text, and syncs them across your devices when you sign
        in. This page explains what data RecipAI handles, why, who processes it,
        and how to have it deleted. RecipAI does not sell your data or use it
        for advertising.
      </p>

      <DocSection title="What we collect">
        <DocList>
          <li>
            <strong>Account data:</strong> when you sign in with Google, your
            name, email address and profile picture; with Telegram, your
            Telegram id, username and name; and passkeys you register (public
            keys only).
          </li>
          <li>
            <strong>Your content:</strong> recipes (ingredients, steps, photos,
            notes), collections, pantry items, the links, photos and text you
            import, and your import history.
          </li>
          <li>
            <strong>Usage and diagnostics:</strong> product analytics and
            session recordings with text inputs masked (PostHog), page-view and
            performance analytics (Vercel), error reports (Sentry) and server
            logs (Axiom). These include device and browser details and IP
            addresses.
          </li>
          <li>
            <strong>Notifications:</strong> if you turn them on, a web-push
            subscription for your device, or your Telegram chat for bot
            messages.
          </li>
          <li>
            On your device, recipes are also stored locally so the app works
            offline.
          </li>
        </DocList>
      </DocSection>

      <DocSection title="Why we use it">
        <DocList>
          <li>
            To provide the app: sign-in, saving and syncing recipes, importing
            and parsing recipes, notifications.
          </li>
          <li>
            To fix problems and improve the app (error reports, analytics).
          </li>
          <li>To keep the service safe (rate limiting, abuse prevention).</li>
        </DocList>
      </DocSection>

      <DocSection title="Who processes it">
        <p>
          RecipAI relies on these services to run. They process data only to
          provide their service to RecipAI:
        </p>
        <DocList>
          <li>
            Supabase (database), Vercel (hosting, analytics), Upstash (rate
            limiting), ImageKit (image storage)
          </li>
          <li>
            Google Gemini, OpenAI and DeepSeek (reading and structuring
            recipes), Groq (transcribing recipe videos)
          </li>
          <li>
            Apify, PhantomJsCloud and scrape.do (fetching the pages and social
            posts you import)
          </li>
          <li>PostHog, Sentry and Axiom (analytics, error reports, logs)</li>
          <li>Google and Telegram (sign-in), Telegram (bot messages)</li>
        </DocList>
        <p>
          When you import a link, photo or text, its content is sent to these AI
          and fetching services to extract the recipe.
        </p>
      </DocSection>

      <DocSection title="AI assistants (Claude, ChatGPT)">
        <p>
          If you connect RecipAI to an AI assistant such as Claude or ChatGPT,
          that assistant can search, read, create, edit and delete your recipes
          and collections, and import recipes from links, but only while
          connected and only for your own account. RecipAI receives the requests
          the assistant makes; it does not receive your conversations. You can
          disconnect an assistant at any time in RecipAI under Profile → AI
          assistants, which revokes its access immediately. How the assistant
          itself handles your conversation is covered by its provider's privacy
          policy.
        </p>
      </DocSection>

      <DocSection title="How long we keep it">
        <p>
          Your account and content are kept until you delete them or ask us to
          delete your account. Diagnostics and logs are kept for the limited
          periods set by the services above. Connections to AI assistants expire
          after 30 days without use.
        </p>
      </DocSection>

      <DocSection title="Deleting your data">
        <p>
          You can delete recipes and collections in the app at any time. To
          delete your account and all its data, email{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from the address you signed in with; we will delete it within 30 days.
        </p>
      </DocSection>

      <DocSection title="Contact">
        <p>
          Questions about this policy or your data:{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </DocSection>
    </PublicDoc>
  );
}
