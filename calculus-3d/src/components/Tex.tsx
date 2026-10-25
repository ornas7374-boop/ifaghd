import katex from 'katex';
import { Fragment, type ReactNode } from 'react';

const cache = new Map<string, string>();

function render(tex: string, block: boolean) {
  const key = (block ? 'B' : 'I') + tex;
  let html = cache.get(key);
  if (!html) {
    html = katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: 'ignore' });
    cache.set(key, html);
  }
  return html;
}

export function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  if (block) return <div className="tex-block" dir="ltr" dangerouslySetInnerHTML={{ __html: render(tex, true) }} />;
  return <span className="tex" dir="ltr" dangerouslySetInnerHTML={{ __html: render(tex, false) }} />;
}

const TOKEN = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\*\*[^*]+?\*\*)/g;

/** Inline rich text: $tex$, $$display tex$$ and **bold**. */
export function RichInline({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter((p) => p !== '');
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('$$')) return <Tex key={i} tex={p.slice(2, -2)} block />;
        if (p.startsWith('$')) return <Tex key={i} tex={p.slice(1, -1)} />;
        if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

/** Block rich text: blank lines split paragraphs; lines starting with "- " become bullet lists. */
export function Rich({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  const out: ReactNode[] = [];
  blocks.forEach((b, i) => {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => l.startsWith('- '))) {
      out.push(
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j}>
              <RichInline text={l.slice(2)} />
            </li>
          ))}
        </ul>,
      );
    } else if (lines.length === 1 && /^\$\$[\s\S]*\$\$$/.test(lines[0])) {
      out.push(<Tex key={i} tex={lines[0].slice(2, -2)} block />);
    } else {
      out.push(
        <p key={i}>
          <RichInline text={lines.join(' ')} />
        </p>,
      );
    }
  });
  return <>{out}</>;
}
