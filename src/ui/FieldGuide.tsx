import { glossary, profiles } from "../content/fieldGuide";
export function FieldGuide() {
  return (
    <details className="panel field-guide">
      <summary>Field guide · terms, scope and authority</summary>
      <p>
        Reading this guide is free. No conclusion depends on memorising a
        technical term.
      </p>
      <h2>The case scope</h2>
      <dl>
        {profiles.map(([id, title, explanation]) => (
          <div key={id}>
            <dt>
              {title} · {id}
            </dt>
            <dd>{explanation}</dd>
          </div>
        ))}
      </dl>
      <h2>Words in context</h2>
      <dl>
        {glossary.map(([term, explanation]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{explanation}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
