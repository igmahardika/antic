import React, { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { SearchResult } from '../../types/documentation';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  onResultClick: (result: SearchResult) => void;
  onClearSearch: () => void;
}

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onResultClick,
  onClearSearch,
}: SearchBarProps) {
  const [showResults, setShowResults] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');

  const filteredResults = searchResults.filter(result => 
    filterType === 'all' || result.type === filterType
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'relevance':
        return b.relevanceScore - a.relevanceScore;
      case 'type':
        return a.type.localeCompare(b.type);
      case 'section':
        return a.sectionTitle.localeCompare(b.sectionTitle);
      default:
        return 0;
    }
  });

  useEffect(() => {
    setShowResults(searchQuery.length > 0);
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClear = () => {
    setSearchQuery('');
    onClearSearch();
    setShowResults(false);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    setShowResults(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'formula': return '🧮';
      case 'changelog': return '📝';
      case 'metric': return '📊';
      case 'code': return '💻';
      case 'table': return '📋';
      case 'list': return '📝';
      case 'section': return '📁';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'formula': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'changelog': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'metric': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'code': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'table': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'list': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'section': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={handleInputChange}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Filters */}
          <div className="p-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="formula">Formulas</SelectItem>
                  <SelectItem value="changelog">Changelog</SelectItem>
                  <SelectItem value="metric">Metrics</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="table">Tables</SelectItem>
                  <SelectItem value="list">Lists</SelectItem>
                  <SelectItem value="section">Sections</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                </SelectContent>
              </Select>
              
              <Badge variant="secondary" className="ml-auto">
                {sortedResults.length} results
              </Badge>
            </div>
          </div>

          {/* Results List */}
          <div className="p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : sortedResults.length > 0 ? (
              <div className="space-y-1">
                {sortedResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getTypeIcon(result.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {result.contentTitle}
                          </span>
                          <Badge className={`text-xs ${getTypeColor(result.type)}`}>
                            {result.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {result.sectionTitle}
                        </div>
                        <div 
                          className="text-xs text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: result.excerpt }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(result.relevanceScore * 100)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found for "{searchQuery}"</p>
                <p className="text-xs mt-1">Try different keywords or check spelling</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
