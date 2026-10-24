// SPDX-License-Identifier: AGPL-3.0-or-later
import { DISCLAIMER_MARKDOWN } from '@/lib/disclaimer';
import { type ReactNode } from 'react';

function inlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_{1}[^_]+_{1})/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function DisclaimerDocument({
  markdown = DISCLAIMER_MARKDOWN,
  testId = 'disclaimer-text',
}: {
  markdown?: string;
  testId?: string;
}) {
  const blocks = markdown.replace(/\n$/, '').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < blocks.length) {
    const line = blocks[i];
    if (line.startsWith('# ')) {
      nodes.push(<h1 key={key++}>{inlineMarkdown(line.slice(2))}</h1>);
    } else if (line.startsWith('### ')) {
      nodes.push(<h2 key={key++}>{inlineMarkdown(line.slice(4))}</h2>);
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].startsWith('- ')) {
        items.push(blocks[i].slice(2));
        i += 1;
      }
      nodes.push(
        <ul key={key++}>
          {items.map((item) => (
            <li key={item}>{inlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.trim() === '') {
      /* skip blank lines between blocks */
    } else {
      nodes.push(<p key={key++}>{inlineMarkdown(line)}</p>);
    }
    i += 1;
  }
  return (
    <div className="disclaimer-doc" data-testid={testId}>
      {nodes}
    </div>
  );
}
