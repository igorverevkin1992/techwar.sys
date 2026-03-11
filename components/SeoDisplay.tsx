import React, { useState } from 'react';
import { SeoPackage } from '../types';

const downloadSeoTxt = (seo: SeoPackage) => {
  const content = [
    '═══════════════════════════════════════',
    'TITLE OPTIONS',
    '═══════════════════════════════════════',
    ...seo.titles.map((t, i) => `${i + 1}. ${t}`),
    '',
    '═══════════════════════════════════════',
    'DESCRIPTION',
    '═══════════════════════════════════════',
    seo.description,
    '',
    '═══════════════════════════════════════',
    'TAGS',
    '═══════════════════════════════════════',
    seo.tags,
    '',
    '═══════════════════════════════════════',
    'PINNED COMMENT',
    '═══════════════════════════════════════',
    seo.firstComment,
    '',
    '═══════════════════════════════════════',
    'END SCREEN SCRIPT',
    '═══════════════════════════════════════',
    seo.endScreenScript,
    ...(seo.keywords && seo.keywords.length > 0 ? [
      '',
      '═══════════════════════════════════════',
      'KEYWORDS',
      '═══════════════════════════════════════',
      seo.keywords.join(', '),
    ] : []),
    ...(seo.hashtags && seo.hashtags.length > 0 ? [
      '',
      '═══════════════════════════════════════',
      'HASHTAGS',
      '═══════════════════════════════════════',
      seo.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
    ] : []),
    ...(seo.shortsExcerpt ? [
      '',
      '═══════════════════════════════════════',
      'SHORTS EXCERPT',
      '═══════════════════════════════════════',
      seo.shortsExcerpt,
    ] : []),
  ].join('\n');
  const blob = new Blob(['\ufeff', content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'SEO_PACKAGE.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface SeoDisplayProps {
  seo: SeoPackage;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="px-2 py-0.5 text-[10px] font-mono uppercase rounded border border-mw-slate/30 text-mw-slate hover:border-mw-red hover:text-mw-red transition-all"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
};

const SeoDisplay: React.FC<SeoDisplayProps> = ({ seo }) => {
  return (
    <div className="bg-mw-gray/20 rounded-lg border border-mw-slate/30 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-mw-red uppercase tracking-wider">
          YouTube SEO Package
        </h2>
        <button
          onClick={() => downloadSeoTxt(seo)}
          className="px-3 py-1.5 text-[10px] font-mono uppercase rounded border border-mw-slate/30 text-mw-slate hover:border-mw-red hover:text-mw-red transition-all"
        >
          ⬇ Download SEO Package (.txt)
        </button>
      </div>

      {/* Titles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-mw-slate uppercase tracking-wider">Title Options (5)</span>
          <CopyButton text={seo.titles.join('\n')} />
        </div>
        <ol className="flex flex-col gap-1">
          {seo.titles.map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-mw-red font-mono text-xs font-bold mt-0.5">{i + 1}.</span>
              <span className="text-gray-200 text-sm font-mono flex-1">{t}</span>
              <CopyButton text={t} />
            </li>
          ))}
        </ol>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-mw-slate uppercase tracking-wider">Description</span>
          <CopyButton text={seo.description} />
        </div>
        <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap bg-black/30 border border-mw-slate/20 rounded p-3 leading-relaxed">
          {seo.description}
        </pre>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-mw-slate uppercase tracking-wider">Tags</span>
          <div className="flex items-center gap-2">
            {(() => {
              const count = seo.tagCharCount ?? seo.tags.length;
              const over = count > 500;
              return (
                <span className={`text-[10px] font-mono ${over ? 'text-red-400' : 'text-green-400'}`}>
                  {count}/500 chars
                </span>
              );
            })()}
            <CopyButton text={seo.tags} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {seo.tags.split(',').map((tag, i) => (
            <span key={i} className="px-2 py-0.5 text-[10px] font-mono rounded bg-mw-slate/10 border border-mw-slate/20 text-mw-slate">
              {tag.trim()}
            </span>
          ))}
        </div>
      </div>

      {/* Keywords */}
      {seo.keywords && seo.keywords.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-mw-slate uppercase tracking-wider">Keywords</span>
            <CopyButton text={seo.keywords.join(', ')} />
          </div>
          <div className="flex flex-wrap gap-1">
            {seo.keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-mw-slate/10 border border-mw-slate/20 text-mw-slate">
                {kw}
                <CopyButton text={kw} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hashtags */}
      {seo.hashtags && seo.hashtags.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-mw-slate uppercase tracking-wider">Hashtags</span>
            <CopyButton text={seo.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')} />
          </div>
          <div className="flex flex-wrap gap-1">
            {seo.hashtags.map((ht, i) => {
              const display = ht.startsWith('#') ? ht : `#${ht}`;
              return (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-mw-red/10 border border-mw-red/20 text-mw-red">
                  {display}
                  <CopyButton text={display} />
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Shorts Excerpt */}
      {seo.shortsExcerpt && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-mw-slate uppercase tracking-wider">Shorts Excerpt</span>
            <CopyButton text={seo.shortsExcerpt} />
          </div>
          <p className="text-gray-300 text-sm font-mono bg-black/30 border border-mw-slate/20 rounded p-3">
            {seo.shortsExcerpt}
          </p>
        </div>
      )}

      {/* First Comment */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-mw-slate uppercase tracking-wider">Pinned Comment</span>
          <CopyButton text={seo.firstComment} />
        </div>
        <p className="text-gray-300 text-sm font-mono bg-black/30 border border-mw-slate/20 rounded p-3">
          {seo.firstComment}
        </p>
      </div>

      {/* End Screen Script */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-mw-slate uppercase tracking-wider">End Screen Script</span>
          <CopyButton text={seo.endScreenScript} />
        </div>
        <p className="text-gray-300 text-sm font-mono bg-black/30 border border-mw-slate/20 rounded p-3 italic">
          "{seo.endScreenScript}"
        </p>
      </div>
    </div>
  );
};

export default React.memo(SeoDisplay);
