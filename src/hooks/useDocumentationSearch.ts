import { useState, useCallback, useMemo } from 'react';
import type { DocumentationSection, SearchResult } from '../types/documentation';

export const useDocumentationSearch = (sections: DocumentationSection[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const searchContent = useCallback((query: string) => {
    if (!query.trim()) return [];
    
    setIsSearching(true);
    
    const results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase();
    
    sections.forEach(section => {
      // Search in section title
      if (section.title.toLowerCase().includes(normalizedQuery)) {
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          contentId: 'section-title',
          contentTitle: section.title,
          excerpt: section.title,
          relevanceScore: 1.0,
          type: 'section'
        });
      }
      
      // Search in content blocks
      section.content.forEach(block => {
        const searchableText = extractSearchableText(block);
        if (searchableText.toLowerCase().includes(normalizedQuery)) {
          const excerpt = createExcerpt(searchableText, normalizedQuery);
          results.push({
            sectionId: section.id,
            sectionTitle: section.title,
            contentId: block.id,
            contentTitle: getContentTitle(block),
            excerpt,
            relevanceScore: calculateRelevanceScore(searchableText, normalizedQuery),
            type: block.type
          });
        }
      });
    });
    
    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    setIsSearching(false);
    return results;
  }, [sections]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchContent(searchQuery);
  }, [searchQuery, searchContent]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    clearSearch,
    searchContent
  };
};

// Helper functions
function extractSearchableText(block: any): string {
  switch (block.type) {
    case 'formula':
      return [
        block.data.name,
        block.data.description,
        block.data.formula,
        ...block.data.dataSource,
        block.data.example?.calculation || '',
        block.data.target || ''
      ].join(' ');
    
    case 'changelog':
      return [
        block.data.title,
        block.data.description,
        ...block.data.features,
        ...block.data.improvements,
        ...block.data.fixes
      ].join(' ');
    
    case 'metric':
      return [
        block.data.name,
        block.data.description,
        block.data.formula,
        block.data.target,
        block.data.category
      ].join(' ');
    
    case 'code':
      return block.data;
    
    case 'table':
      return [
        ...(block.data.headers || []),
        ...(block.data.rows?.flat() || [])
      ].join(' ');
    
    case 'list':
      return (block.data.items || []).join(' ');
    
    default:
      return String(block.data || '');
  }
}

function createExcerpt(text: string, query: string, maxLength: number = 150): string {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text.substring(0, maxLength) + '...';
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 50);
  
  let excerpt = text.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  
  return excerpt;
}

function calculateRelevanceScore(text: string, query: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  
  let score = 0;
  
  // Exact match gets highest score
  if (normalizedText.includes(normalizedQuery)) {
    score += 1.0;
  }
  
  // Word boundary matches get higher score
  const words = normalizedQuery.split(' ');
  words.forEach(word => {
    if (normalizedText.includes(word)) {
      score += 0.5;
    }
  });
  
  // Title matches get higher score
  if (normalizedText.startsWith(normalizedQuery)) {
    score += 0.3;
  }
  
  return Math.min(score, 1.0);
}

function getContentTitle(block: any): string {
  switch (block.type) {
    case 'formula':
      return block.data.name;
    case 'changelog':
      return block.data.title;
    case 'metric':
      return block.data.name;
    case 'code':
      return 'Code Block';
    case 'table':
      return 'Data Table';
    case 'list':
      return 'List';
    default:
      return 'Content';
  }
}
