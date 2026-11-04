import type { Metadata } from "next";
import Link from "next/link";
import { DocList, DocSection, PublicDoc } from "@/components/public-doc";
import { mcpResourceUrl } from "@/lib/mcp/config";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "RecipAI for Claude and ChatGPT",
  description:
    "Connect your RecipAI recipe library to Claude or ChatGPT: save, find, edit and import recipes from any chat.",
};

const EXAMPLE_PROMPTS = [
  {
    prompt:
      "Save this to RecipAI: Pancakes, serves 4. 200 g flour, 2 eggs, 300 ml milk, 1 tbsp sugar, a pinch of salt. Whisk everything into a smooth batter, rest 10 minutes, then fry thin pancakes in a hot buttered pan.",
    result:
      "Claude structures the recipe (ingredients with amounts and units, numbered steps, servings) and saves it to your library.",
  },
  {
    prompt: "Import this recipe into RecipAI: https://www.instagram.com/reel/…",
    result:
      "RecipAI's own parser transcribes the video and saves the recipe; Claude reports back when it's ready.",
  },
  {
    prompt:
      "Find my borscht recipe in RecipAI and change it to serve 8, doubling the beets.",
    result:
      "Claude searches your library, reads the recipe, and updates the servings and ingredient amounts.",
  },
];

export default function ConnectorDocsPage() {
  const connectorUrl = mcpResourceUrl();
  return (
    <PublicDoc title="RecipAI for Claude and ChatGPT">
      <p>
        RecipAI keeps your recipes in one place: imported from websites,
        Instagram, TikTok, YouTube, photos or text, organised in collections,
        and synced across your devices. The RecipAI connector lets Claude (and
        ChatGPT) work with that library directly from a chat: save a recipe
        you&apos;re discussing, find one, change it, or import a link.
      </p>

      <DocSection title="Connect">
        <p>
          You need a RecipAI account (sign in with Google, Telegram or a
          passkey).
        </p>
        <DocList>
          <li>
            <strong>Claude:</strong> open Connectors, find RecipAI and choose
            Connect. If it isn&apos;t listed for you, add a custom connector
            with the URL <code className="break-all">{connectorUrl}</code>.
          </li>
          <li>
            <strong>ChatGPT:</strong> add a custom connector with the same URL
            (in ChatGPT on the web or desktop app; it then works on your phone
            too).
          </li>
          <li>
            Sign in to RecipAI when asked, then choose <strong>Allow</strong>.
            The assistant now works only with your own recipes.
          </li>
        </DocList>
      </DocSection>

      <DocSection title="What it can do">
        <DocList>
          <li>
            <strong>search</strong> — find recipes by words in the title,
            ingredients or collection name, or list the newest.
          </li>
          <li>
            <strong>fetch</strong> — read a recipe in full.
          </li>
          <li>
            <strong>create_recipe</strong> — save a recipe the assistant has
            read from text, a photo or a web page.
          </li>
          <li>
            <strong>update_recipe</strong> — change any part of a recipe,
            including its photo.
          </li>
          <li>
            <strong>delete_recipe</strong> — delete a recipe (the assistant asks
            you first).
          </li>
          <li>
            <strong>import_recipe</strong> and{" "}
            <strong>get_import_status</strong> — import a social post or web
            page with RecipAI&apos;s own parser.
          </li>
          <li>
            <strong>list_collections</strong>,{" "}
            <strong>create_collection</strong>,{" "}
            <strong>add_to_collection</strong>,{" "}
            <strong>remove_from_collection</strong> — organise recipes.
          </li>
        </DocList>
        <p>
          Changes appear in the RecipAI app the next time it syncs (when you
          open it or pull to refresh).
        </p>
      </DocSection>

      <DocSection title="Example prompts">
        <ol className="list-decimal space-y-4 pl-5">
          {EXAMPLE_PROMPTS.map(({ prompt, result }) => (
            <li key={prompt}>
              <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
                “{prompt}”
              </p>
              <p className="mt-1.5 text-white/60">{result}</p>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection title="Disconnect">
        <p>
          In RecipAI, open Profile → AI assistants and choose Disconnect. The
          assistant loses access immediately. You can also remove the connector
          in the assistant&apos;s settings.
        </p>
      </DocSection>

      <DocSection title="Privacy and support">
        <p>
          See the{" "}
          <Link className="underline" href="/privacy">
            privacy policy
          </Link>{" "}
          for what RecipAI stores and who processes it. Questions or problems:{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </DocSection>
    </PublicDoc>
  );
}
