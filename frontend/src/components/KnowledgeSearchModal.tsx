import { FormEvent, useEffect, useRef, useState } from 'react';
import { searchKnowledge } from '../services/api';
import type { Citation } from '../types/resolution';

interface Props {
  onClose: () => void;
}

export default function KnowledgeSearchModal({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;
    setLoading(true);
    setError('');
    try {
      setResults(await searchKnowledge(normalizedQuery, category || undefined));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Search failed.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="resolution-modal" role="dialog" aria-modal="true" aria-labelledby="kb-title" tabIndex={-1} ref={dialogRef}>
        <div className="modal-header">
          <div>
            <h3 id="kb-title">SupportPilot Knowledge Base Explorer</h3>
            <p className="modal-subtitle">Search enterprise IT runbooks &amp; SOPs via semantic RAG</p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close knowledge base search">✕</button>
        </div>

        <form onSubmit={handleSearch} className="kb-search-form">
          <input
            type="text"
            placeholder="Search issue (e.g. Cisco VPN error 403, Wi-Fi DNS, Okta lockout)..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="kb-search-input"
            aria-label="Knowledge base search"
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            <option value="Network Connectivity">Network</option>
            <option value="VPN Access">VPN</option>
            <option value="Software & Applications">Software</option>
            <option value="Identity & Access">Identity</option>
          </select>
          <button type="submit" disabled={loading}>{loading ? 'Searching...' : '🔍 Search'}</button>
        </form>

        {error && <p className="error" role="alert">{error}</p>}
        <div className="kb-results-list" aria-live="polite">
          {results.length === 0 && !loading && !error && <p className="empty-notice">Enter a query above to search indexed runbooks.</p>}
          {results.map((hit, index) => (
            <article key={hit.article_id ?? `${hit.title}-${index}`} className="kb-result-card">
              <div className="kb-result-header">
                <strong>{hit.title}</strong>
                <span className="badge badge-success">{Math.round(hit.similarity * 100)}% match</span>
              </div>
              <p className="kb-result-cat">Category: {hit.category}</p>
              <pre className="kb-snippet">{hit.snippet}</pre>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
