import { useState } from "react";

// Footer content. Defaults shown here; in production these load from the
// `content` table that the admin Content Studio edits (keys: footer.privacy,
// footer.contact, footer.faqs), exactly like the rest of the site's content.
const DEFAULT = {
  privacy:
    "MyAfriart respects your privacy. We collect only what's needed to show you art, process orders and run AI room-staging, never sell your personal data, and handle payments through regulated providers. You can request deletion of your data at any time.",
  contact:
    "MyAfriart (a ZonicMe company)\nFloor M2, Transcorp Hilton, Abuja, Nigeria\n\nSupport: hello@myafriart.com\nArtists: artists@myafriart.com",
  faqs: [
    {
      q: "What is room-staging?",
      a: "Upload a photo of your room and our AI places any artwork on your wall so you can see it in your space before buying.",
    },
    {
      q: "How do I buy a piece?",
      a: "Open any artwork and follow the purchase link; the sale is between you and the artist, with MyAfriart handling secure payment.",
    },
    {
      q: "Can artists list their work?",
      a: "Yes — apply through the Artists link and our team reviews submissions.",
    },
  ],
};

type Key = "privacy" | "faqs" | "contact";
const TITLES: Record<Key, string> = {
  privacy: "Privacy",
  faqs: "Frequently asked questions",
  contact: "Contact us",
};

export default function SiteFooter({ content = DEFAULT }: { content?: typeof DEFAULT }) {
  const [open, setOpen] = useState<Key | null>(null);
  const [faq, setFaq] = useState<number | null>(0);

  return (
    <>
      <nav className="flex justify-center gap-9 border-t border-neutral-200 bg-white px-4 py-6">
        {(["privacy", "faqs", "contact"] as Key[]).map((k) => (
          <button
            key={k}
            onClick={() => setOpen(k)}
            className="text-sm font-semibold text-neutral-500 hover:text-neutral-900"
          >
            {k === "faqs" ? "FAQ" : TITLES[k]}
          </button>
        ))}
      </nav>

      {open && <div className="fixed inset-0 z-[88] bg-black/40" onClick={() => setOpen(null)} />}
      <section
        className={`fixed inset-x-0 bottom-0 z-[92] max-h-[82vh] overflow-auto rounded-t-2xl border-t border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <button
          onClick={() => setOpen(null)}
          className="absolute right-5 top-4 text-2xl text-neutral-400"
        >
          ×
        </button>
        <div className="mx-auto max-w-3xl px-6 pb-12 pt-8">
          <h2 className="mb-5 text-2xl font-extrabold tracking-tight text-neutral-900">
            {open ? TITLES[open] : ""}
          </h2>
          {open === "faqs" ? (
            <div>
              {content.faqs.map((f, i) => (
                <div key={i} className="border-b border-neutral-200">
                  <button
                    onClick={() => setFaq(faq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-bold text-neutral-900"
                  >
                    {f.q}
                    <span className="text-xl text-neutral-500">{faq === i ? "−" : "+"}</span>
                  </button>
                  {faq === i && (
                    <p className="pb-4 text-[15px] leading-relaxed text-neutral-500">{f.a}</p>
                  )}
                </div>
              ))}
            </div>
          ) : open ? (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
              {content[open]}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
