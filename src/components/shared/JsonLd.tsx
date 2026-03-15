/**
 * WebSite JSON-LD structured data.
 *
 * Adds sitelinks search box eligibility and helps search engines understand
 * the platform type. Include once in the root layout.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export default function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":  "WebSite",
        "@id":    `${APP_URL}/#website`,
        url:      APP_URL,
        name:     "LocalPro",
        description:
          "Trusted marketplace for local service professionals in the Philippines. Post a job, receive quotes, and pay securely with escrow protection.",
        publisher: { "@id": `${APP_URL}/#organization` },
        potentialAction: [
          {
            "@type":       "SearchAction",
            target:        { "@type": "EntryPoint", urlTemplate: `${APP_URL}/jobs?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        ],
        inLanguage: "en-PH",
      },
      {
        "@type": "Organization",
        "@id":   `${APP_URL}/#organization`,
        name:    "LocalPro",
        url:     APP_URL,
        logo: {
          "@type":      "ImageObject",
          "@id":        `${APP_URL}/#logo`,
          url:          `${APP_URL}/icons/icon-512.png`,
          width:        "512",
          height:       "512",
          caption:      "LocalPro",
        },
        image:       { "@id": `${APP_URL}/#logo` },
        description: "LocalPro connects clients with KYC-verified service professionals across the Philippines.",
        foundingDate: "2025",
        areaServed:  { "@type": "Country", name: "Philippines" },
        sameAs: [
          "https://www.facebook.com/localprophilippines",
        ],
        contactPoint: {
          "@type":             "ContactPoint",
          contactType:         "customer support",
          availableLanguage:   ["English", "Filipino"],
          url:                 `${APP_URL}/support`,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
