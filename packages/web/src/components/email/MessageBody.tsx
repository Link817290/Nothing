import { useRef, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import DOMPurify from 'dompurify';

interface MessageBodyProps {
  content: string;
  source: string;  // 'nmp' | 'external'
}

/**
 * Renders message content based on source:
 * - NMP messages: Markdown rendering (agent-to-agent communication)
 * - External emails: Sanitized HTML in sandboxed iframe
 */
export function MessageBody({ content, source }: MessageBodyProps) {
  if (source === 'nmp') {
    return <NmpContent content={content} />;
  }

  // Check if content looks like HTML
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return <HtmlContent html={content} />;
  }

  // Plain text fallback
  return (
    <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
      {content}
    </div>
  );
}

/** NMP message — render as Markdown */
function NmpContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none
      prose-headings:font-semibold prose-headings:text-foreground prose-headings:tracking-tight
      prose-p:text-foreground/90 prose-p:leading-relaxed
      prose-a:text-brand prose-a:no-underline hover:prose-a:underline
      prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
      prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
      prose-blockquote:border-brand prose-blockquote:text-muted-foreground
      prose-li:text-foreground/90
      prose-hr:border-border
      prose-strong:text-foreground
    ">
      <Markdown>{content}</Markdown>
    </div>
  );
}

/** External HTML email — sandboxed iframe */
function HtmlContent({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);

  const sanitized = DOMPurify.sanitize(html, {
    ALLOW_TAGS: [
      'a', 'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'img', 'blockquote', 'pre', 'code', 'hr',
      'style', 'font', 'center',
    ],
    ALLOW_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height',
      'style', 'class', 'align', 'valign', 'bgcolor', 'color',
      'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'],
    ADD_ATTR: ['target'],
  });

  // Wrap in a document with base styles
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    color: #1C1917;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  img { max-width: 100%; height: auto; }
  a { color: #FE551B; }
  table { max-width: 100%; }
  pre, code { white-space: pre-wrap; }
  blockquote {
    margin: 0;
    padding-left: 12px;
    border-left: 3px solid #e5e7eb;
    color: #787878;
  }
</style>
</head>
<body>${sanitized}</body>
</html>`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resizeObserver = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          const newHeight = Math.max(doc.body.scrollHeight + 20, 100);
          setHeight(Math.min(newHeight, 2000)); // cap at 2000px
        }
      } catch {}
    };

    iframe.addEventListener('load', resizeObserver);
    return () => iframe.removeEventListener('load', resizeObserver);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      className="w-full border-0 rounded-lg bg-white"
      style={{ height: `${height}px` }}
      title="Email content"
    />
  );
}
