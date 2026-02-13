/**
 * AISmartSearch.tsx - Sprint 34 Task 4
 * Smart Search with semantic search, embeddings, and AI summaries
 * Nielsen Heuristic: Recognition rather than recall, Help users recognize
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  relevanceScore: number;
  category: 'help' | 'faq' | 'docs' | 'questionnaire' | 'history';
  highlights: string[];
  matchedKeywords: string[];
}

export interface EmbeddingVector {
  id: string;
  vector: number[];
  metadata: {
    title: string;
    url: string;
    category: string;
  };
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'related';
  count?: number;
}

export interface AISearchSummary {
  query: string;
  summary: string;
  keyPoints: string[];
  relatedTopics: string[];
  confidence: number;
}

export interface SmartSearchContextValue {
  query: string;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  aiSummary: AISearchSummary | null;
  isSearching: boolean;
  recentSearches: string[];
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  addToRecentSearches: (query: string) => void;
}

// ============================================================================
// Context
// ============================================================================

const SmartSearchContext = createContext<SmartSearchContextValue | null>(null);

export const useSmartSearch = (): SmartSearchContextValue => {
  const context = useContext(SmartSearchContext);
  if (!context) {
    throw new Error('useSmartSearch must be used within SmartSearchProvider');
  }
  return context;
};

// ============================================================================
// Embedding Service (Mock - Replace with actual embedding API)
// ============================================================================

class EmbeddingService {
  private static embeddings: Map<string, EmbeddingVector> = new Map();

  static async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding generation - in production, call OpenAI/Azure embeddings API
    const hash = this.simpleHash(text);
    const vector = new Array(384).fill(0).map((_, i) => Math.sin(hash + i) * 0.5);
    return vector;
  }

  static async searchSimilar(query: string, topK: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results: { id: string; score: number; metadata: Record<string, unknown> }[] = [];

    this.embeddings.forEach((embedding, id) => {
      const score = this.cosineSimilarity(queryEmbedding, embedding.vector);
      results.push({ id, score, metadata: embedding.metadata });
    });

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK).map((r, _index) => ({
      id: r.id,
      title: r.metadata.title as string,
      content: `Content for ${r.metadata.title}`,
      url: r.metadata.url as string,
      relevanceScore: r.score,
      category: r.metadata.category as SearchResult['category'],
      highlights: [],
      matchedKeywords: query.split(' ').slice(0, 3),
    }));
  }

  static addDocument(id: string, text: string, metadata: EmbeddingVector['metadata']): void {
    const vector = new Array(384).fill(0).map((_, i) => Math.sin(this.simpleHash(text) + i) * 0.5);
    this.embeddings.set(id, { id, vector, metadata });
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Initialize with sample documents
const SAMPLE_DOCUMENTS = [
  {
    id: 'help-1',
    title: 'Getting Started with Questionnaires',
    url: '/help/getting-started',
    category: 'help',
  },
  {
    id: 'help-2',
    title: 'Understanding Your Readiness Score',
    url: '/help/readiness-score',
    category: 'help',
  },
  {
    id: 'help-3',
    title: 'Uploading Evidence Documents',
    url: '/help/evidence-upload',
    category: 'help',
  },
  {
    id: 'faq-1',
    title: 'How do I reset my password?',
    url: '/help/faq#password-reset',
    category: 'faq',
  },
  {
    id: 'faq-2',
    title: 'What file types are supported for evidence?',
    url: '/help/faq#file-types',
    category: 'faq',
  },
  {
    id: 'faq-3',
    title: 'How is the risk score calculated?',
    url: '/help/faq#risk-calculation',
    category: 'faq',
  },
  { id: 'docs-1', title: 'ISO 27001 Compliance Guide', url: '/docs/iso-27001', category: 'docs' },
  { id: 'docs-2', title: 'NIST CSF Framework Overview', url: '/docs/nist-csf', category: 'docs' },
  { id: 'docs-3', title: 'OWASP ASVS Requirements', url: '/docs/owasp-asvs', category: 'docs' },
];

SAMPLE_DOCUMENTS.forEach((doc) => {
  EmbeddingService.addDocument(doc.id, doc.title, {
    title: doc.title,
    url: doc.url,
    category: doc.category,
  });
});

// ============================================================================
// Provider Component
// ============================================================================

interface SmartSearchProviderProps {
  children: React.ReactNode;
  apiEndpoint?: string;
}

export const SmartSearchProvider: React.FC<SmartSearchProviderProps> = ({
  children,
  apiEndpoint: _apiEndpoint = '/api/search',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [aiSummary, setAiSummary] = useState<AISearchSummary | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('quiz2biz_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const searchTimeout = useRef<NodeJS.Timeout>(undefined);

  // Generate AI summary for search results
  const generateAISummary = useCallback(
    async (searchQuery: string, searchResults: SearchResult[]): Promise<AISearchSummary> => {
      // Mock AI summary generation - in production, call OpenAI/Azure API
      await new Promise((resolve) => setTimeout(resolve, 300));

      const keyPoints = searchResults.slice(0, 3).map((r) => r.title);
      const relatedTopics = searchResults
        .flatMap((r) => r.matchedKeywords)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5);

      return {
        query: searchQuery,
        summary: `Found ${searchResults.length} relevant results for "${searchQuery}". The most relevant topics include ${keyPoints.slice(0, 2).join(' and ')}.`,
        keyPoints,
        relatedTopics,
        confidence:
          searchResults.length > 0
            ? Math.min(0.95, 0.5 + searchResults[0].relevanceScore * 0.5)
            : 0.3,
      };
    },
    [],
  );

  // Semantic search function
  const search = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setAiSummary(null);
        return;
      }

      setQuery(searchQuery);
      setIsSearching(true);

      try {
        // Clear previous timeout
        if (searchTimeout.current) {
          clearTimeout(searchTimeout.current);
        }

        // Debounce search
        await new Promise<void>((resolve) => {
          searchTimeout.current = setTimeout(resolve, 150);
        });

        // Perform semantic search using embeddings
        const semanticResults = await EmbeddingService.searchSimilar(searchQuery, 10);

        // Also perform keyword-based search for comparison
        const keywordResults = performKeywordSearch(searchQuery);

        // Merge and deduplicate results
        const mergedResults = mergeSearchResults(semanticResults, keywordResults);

        setResults(mergedResults);

        // Generate AI summary
        if (mergedResults.length > 0) {
          const summary = await generateAISummary(searchQuery, mergedResults);
          setAiSummary(summary);
        } else {
          setAiSummary(null);
        }

        // Update suggestions based on results
        const newSuggestions: SearchSuggestion[] = mergedResults.slice(0, 3).map((r, i) => ({
          id: `related-${i}`,
          text: r.title,
          type: 'related' as const,
        }));
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setAiSummary(null);
      } finally {
        setIsSearching(false);
      }
    },
    [generateAISummary],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setAiSummary(null);
    setSuggestions([]);
  }, []);

  const addToRecentSearches = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      return;
    }

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== searchQuery);
      const updated = [searchQuery, ...filtered].slice(0, 10);
      localStorage.setItem('quiz2biz_recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: SmartSearchContextValue = {
    query,
    results,
    suggestions,
    aiSummary,
    isSearching,
    recentSearches,
    search,
    clearSearch,
    addToRecentSearches,
  };

  return <SmartSearchContext.Provider value={value}>{children}</SmartSearchContext.Provider>;
};

// ============================================================================
// Helper Functions
// ============================================================================

function performKeywordSearch(query: string): SearchResult[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 2);
  const results: SearchResult[] = [];

  SAMPLE_DOCUMENTS.forEach((doc) => {
    const titleLower = doc.title.toLowerCase();
    const matchedKeywords = keywords.filter((k) => titleLower.includes(k));

    if (matchedKeywords.length > 0) {
      const score = matchedKeywords.length / keywords.length;
      results.push({
        id: doc.id,
        title: doc.title,
        content: `Content for ${doc.title}`,
        url: doc.url,
        relevanceScore: score,
        category: doc.category as SearchResult['category'],
        highlights: matchedKeywords.map((k) => highlightKeyword(doc.title, k)),
        matchedKeywords,
      });
    }
  });

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function highlightKeyword(text: string, keyword: string): string {
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '**$1**');
}

function mergeSearchResults(semantic: SearchResult[], keyword: SearchResult[]): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  // Add semantic results with higher base score
  semantic.forEach((result) => {
    merged.set(result.id, { ...result, relevanceScore: result.relevanceScore * 1.2 });
  });

  // Merge keyword results
  keyword.forEach((result) => {
    const existing = merged.get(result.id);
    if (existing) {
      existing.relevanceScore = Math.min(1, existing.relevanceScore + result.relevanceScore * 0.3);
      existing.matchedKeywords = [
        ...new Set([...existing.matchedKeywords, ...result.matchedKeywords]),
      ];
      existing.highlights = [...existing.highlights, ...result.highlights];
    } else {
      merged.set(result.id, result);
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  searchContainer: {
    position: 'relative' as const,
    width: '100%',
  },
  searchInputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    padding: '12px 48px 12px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: '#fff',
  },
  searchInputFocused: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  searchIcon: {
    position: 'absolute' as const,
    right: '16px',
    color: '#64748b',
    pointerEvents: 'none' as const,
  },
  clearButton: {
    position: 'absolute' as const,
    right: '48px',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    color: '#94a3b8',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '8px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    maxHeight: '500px',
    overflowY: 'auto' as const,
    zIndex: 1000,
  },
  aiSummaryBox: {
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderBottom: '1px solid #e0f2fe',
    borderRadius: '12px 12px 0 0',
  },
  aiSummaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  aiSummaryTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#0369a1',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  aiSummaryText: {
    fontSize: '14px',
    color: '#334155',
    lineHeight: 1.5,
    margin: 0,
  },
  keyPoints: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginTop: '12px',
  },
  keyPointTag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    fontSize: '12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '16px',
    fontWeight: 500,
  },
  resultsList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  resultItem: {
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  resultItemHover: {
    backgroundColor: '#f8fafc',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  resultCategory: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
  },
  categoryHelp: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  categoryFaq: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  categoryDocs: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  resultUrl: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  relevanceBar: {
    marginTop: '8px',
    height: '3px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  relevanceFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '2px',
    transition: 'width 0.3s',
  },
  suggestionsSection: {
    padding: '12px 16px',
    backgroundColor: '#fafafa',
    borderTop: '1px solid #f1f5f9',
    borderRadius: '0 0 12px 12px',
  },
  suggestionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  suggestionTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  suggestionTag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    fontSize: '13px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    color: '#475569',
  },
  recentSearches: {
    padding: '16px',
  },
  recentTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#475569',
    fontSize: '14px',
    transition: 'background-color 0.15s',
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '8px',
    color: '#64748b',
    fontSize: '14px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  noResults: {
    padding: '32px 16px',
    textAlign: 'center' as const,
    color: '#64748b',
  },
  noResultsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '8px',
  },
  noResultsText: {
    fontSize: '14px',
    marginBottom: '16px',
  },
};

// ============================================================================
// UI Components
// ============================================================================

interface SearchInputProps {
  placeholder?: string;
  autoFocus?: boolean;
  showRecentOnFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search help, docs, and FAQs...',
  autoFocus = false,
  showRecentOnFocus = true,
}) => {
  const { query, search, clearSearch, isSearching, recentSearches, addToRecentSearches } =
    useSmartSearch();
  const [isFocused, setIsFocused] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    search(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && localQuery.trim()) {
      addToRecentSearches(localQuery.trim());
    }
    if (e.key === 'Escape') {
      clearSearch();
      setLocalQuery('');
      inputRef.current?.blur();
    }
  };

  const handleRecentClick = (searchText: string) => {
    setLocalQuery(searchText);
    search(searchText);
    addToRecentSearches(searchText);
  };

  const handleClear = () => {
    clearSearch();
    setLocalQuery('');
    inputRef.current?.focus();
  };

  const showRecent = isFocused && !localQuery && recentSearches.length > 0 && showRecentOnFocus;

  return (
    <div style={styles.searchContainer}>
      <div style={styles.searchInputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            ...styles.searchInput,
            ...(isFocused ? styles.searchInputFocused : {}),
          }}
          aria-label="Search"
          aria-describedby="search-hint"
        />
        {localQuery && (
          <button onClick={handleClear} style={styles.clearButton} aria-label="Clear search">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        <span style={styles.searchIcon}>
          {isSearching ? (
            <div style={styles.spinner} />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </span>
      </div>

      {showRecent && (
        <div style={styles.resultsContainer}>
          <div style={styles.recentSearches}>
            <div style={styles.recentTitle}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              Recent Searches
            </div>
            <div style={styles.recentList}>
              {recentSearches.slice(0, 5).map((recent, index) => (
                <div
                  key={index}
                  style={styles.recentItem}
                  onClick={() => handleRecentClick(recent)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {recent}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchResults: React.FC = () => {
  const { results, aiSummary, isSearching, query, suggestions, search, addToRecentSearches } =
    useSmartSearch();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!query) {
    return null;
  }

  if (isSearching) {
    return (
      <div style={styles.resultsContainer}>
        <div style={styles.loadingIndicator}>
          <div style={styles.spinner} />
          <span>Searching with AI...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={styles.resultsContainer}>
        <div style={styles.noResults}>
          <div style={styles.noResultsTitle}>No results found</div>
          <div style={styles.noResultsText}>
            We couldn't find anything matching "{query}". Try different keywords or check your
            spelling.
          </div>
        </div>
      </div>
    );
  }

  const getCategoryStyle = (category: SearchResult['category']) => {
    switch (category) {
      case 'help':
        return styles.categoryHelp;
      case 'faq':
        return styles.categoryFaq;
      case 'docs':
        return styles.categoryDocs;
      default:
        return {};
    }
  };

  const handleResultClick = (result: SearchResult) => {
    addToRecentSearches(query);
    // Navigate to result URL
    window.location.assign(result.url);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    search(suggestion.text);
    addToRecentSearches(suggestion.text);
  };

  return (
    <div style={styles.resultsContainer}>
      {/* AI Summary */}
      {aiSummary && (
        <div style={styles.aiSummaryBox}>
          <div style={styles.aiSummaryHeader}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0369a1"
              strokeWidth="2"
            >
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span style={styles.aiSummaryTitle}>AI Summary</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              ({Math.round(aiSummary.confidence * 100)}% confident)
            </span>
          </div>
          <p style={styles.aiSummaryText}>{aiSummary.summary}</p>
          {aiSummary.keyPoints.length > 0 && (
            <div style={styles.keyPoints}>
              {aiSummary.keyPoints.map((point, index) => (
                <span key={index} style={styles.keyPointTag}>
                  {point}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results List */}
      <ul style={styles.resultsList} role="listbox" aria-label="Search results">
        {results.map((result) => (
          <li
            key={result.id}
            style={{
              ...styles.resultItem,
              ...(hoveredId === result.id ? styles.resultItemHover : {}),
            }}
            onMouseEnter={() => setHoveredId(result.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleResultClick(result)}
            role="option"
            aria-selected={hoveredId === result.id}
          >
            <div style={styles.resultHeader}>
              <h4 style={styles.resultTitle}>{result.title}</h4>
              <span style={{ ...styles.resultCategory, ...getCategoryStyle(result.category) }}>
                {result.category}
              </span>
            </div>
            <p style={styles.resultUrl}>{result.url}</p>
            <div style={styles.relevanceBar}>
              <div
                style={{
                  ...styles.relevanceFill,
                  width: `${Math.round(result.relevanceScore * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Related Suggestions */}
      {suggestions.length > 0 && (
        <div style={styles.suggestionsSection}>
          <div style={styles.suggestionTitle}>Related Topics</div>
          <div style={styles.suggestionTags}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                style={styles.suggestionTag}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Full Search Component
// ============================================================================

interface SmartSearchBoxProps {
  placeholder?: string;
  autoFocus?: boolean;
}

export const SmartSearchBox: React.FC<SmartSearchBoxProps> = ({ placeholder, autoFocus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }} onFocus={() => setIsOpen(true)}>
      <SearchInput placeholder={placeholder} autoFocus={autoFocus} />
      {isOpen && <SearchResults />}
    </div>
  );
};

// ============================================================================
// Keyboard Shortcut Hook
// ============================================================================

export const useSearchShortcut = (onOpen: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onOpen();
      }
      // / key to open search (when not in input)
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault();
        onOpen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
};

// ============================================================================
// CSS Animation (add to global styles or component)
// ============================================================================

const globalStyle = document.createElement('style');
globalStyle.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('style[data-smart-search]')) {
  globalStyle.setAttribute('data-smart-search', 'true');
  document.head.appendChild(globalStyle);
}

export default {
  SmartSearchProvider,
  useSmartSearch,
  SearchInput,
  SearchResults,
  SmartSearchBox,
  useSearchShortcut,
  EmbeddingService,
};
