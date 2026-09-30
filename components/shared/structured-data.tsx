/**
 * Injects a JSON-LD block. Rendered on the server only — the payload is
 * `<`-escaped by `serialiseSchema` so it can never break out of the script tag.
 */
export function StructuredData({ data, id }: { data: unknown; id?: string }) {
  const json = JSON.stringify(data, (_k, v) => (v === undefined ? null : v)).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      id={id}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
