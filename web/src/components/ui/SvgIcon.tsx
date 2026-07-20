import { type JSX } from 'react';

/**
 * Renders inline SVG child shapes from a static SVG fragment string
 * (e.g. '<path d="..."/><circle cx="12" cy="12" r="10"/>').
 *
 * The fragment is a local constant map (never user input), but we avoid
 * `dangerouslySetInnerHTML` by parsing the known-safe shape tags into JSX
 * elements. Only a fixed set of SVG shape elements is supported; anything
 * else is ignored.
 */
const SHAPE_RE =
  /<(path|rect|circle|line|polyline|polygon)([^>]*?)\/?>/g;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z:_-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(raw))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function toCamel(key: string): string {
  return key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

const SUPPORTED = new Set(['path', 'rect', 'circle', 'line', 'polyline', 'polygon']);

export function SvgShapes({ fragment }: { fragment: string }): JSX.Element {
  const shapes: JSX.Element[] = [];
  let m: RegExpExecArray | null;
  SHAPE_RE.lastIndex = 0;
  while ((m = SHAPE_RE.exec(fragment))) {
    const tag = m[1];
    if (!SUPPORTED.has(tag)) continue;
    const attrs = parseAttrs(m[2]);
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attrs)) {
      props[toCamel(k)] = v;
    }
    const Comp = tag as keyof JSX.IntrinsicElements;
    shapes.push(<Comp key={shapes.length} {...props} />);
  }
  return <>{shapes}</>;
}
