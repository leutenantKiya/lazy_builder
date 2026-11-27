import * as Y from 'yjs';

// where the Doc links to each canvas element ("Canvas link" pills), read straight from
// the Doc's Yjs XML so the canvas can show backlinks without mounting an editor
export type Mention = { snippet: string; index: number };

const PILL = 'figmaRef';

function textOf(el: Y.XmlElement | Y.XmlFragment, labelFor: (id: string, stored: string) => string): string {
  return el
    .toArray()
    .map((child) => {
      if (child instanceof Y.XmlText) {
        return child
          .toDelta()
          .map((d: { insert?: unknown }) => (typeof d.insert === 'string' ? d.insert : ''))
          .join('');
      }
      if (child instanceof Y.XmlElement) {
        if (child.nodeName === PILL) {
          // padded so neighbouring pills don't run together; collectMentions tidies the spaces
          return ` ${labelFor(String(child.getAttribute('nodeId') ?? ''), String(child.getAttribute('label') ?? ''))} `;
        }
        return textOf(child, labelFor);
      }
      return '';
    })
    .join('');
}

/** nodeId → every place the Doc links to it, in document order */
export function collectMentions(
  doc: Y.XmlFragment,
  labelFor: (id: string, stored: string) => string,
): Map<string, Mention[]> {
  const out = new Map<string, Mention[]>();
  const walk = (el: Y.XmlElement | Y.XmlFragment) => {
    for (const child of el.toArray()) {
      if (!(child instanceof Y.XmlElement)) continue;
      if (child.nodeName !== PILL) {
        walk(child);
        continue;
      }
      const id = String(child.getAttribute('nodeId') ?? '');
      if (!id) continue;
      const list = out.get(id) ?? [];
      // the block the pill sits in (paragraph, heading, list item) is the snippet
      const snippet = textOf(el, labelFor)
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .trim();
      list.push({ snippet, index: list.length });
      out.set(id, list);
    }
  };
  walk(doc);
  return out;
}
