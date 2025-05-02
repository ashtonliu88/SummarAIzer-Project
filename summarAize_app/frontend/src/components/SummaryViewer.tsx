// src/components/SummaryViewer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm     from 'remark-gfm';
import remarkMath    from 'remark-math';
import rehypeKatex   from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';

interface SummaryViewerProps {
  markdown: string;
}

const SummaryViewer: React.FC<SummaryViewerProps> = ({ markdown }) => (
  <article className="prose prose-lg prose-indigo max-w-none">
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeSanitize, rehypeKatex]}
    >
      {markdown}
    </ReactMarkdown>
  </article>
);

export default SummaryViewer;
