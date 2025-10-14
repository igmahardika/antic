import React, { useState, useEffect } from 'react';
import PageWrapper from '../components/PageWrapper';
import EnhancedCollapsibleSection from '../components/documentation/EnhancedCollapsibleSection';
import ContentRenderer from '../components/documentation/ContentRenderer';
import SearchBar from '../components/documentation/SearchBar';
import { useDocumentationSearch } from '../hooks/useDocumentationSearch';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Bookmark, 
  BookmarkCheck, 
  Download, 
  Filter, 
  SortAsc,
  RefreshCw,
  Settings
} from 'lucide-react';
import type { DocumentationSection, SearchResult } from '../types/documentation';

// Import sample data (in production, this would come from an API)
import documentationData from '../data/documentation-sections.json';

export default function ModernAdminRumus() {
  const [sections, setSections] = useState<DocumentationSection[]>([]);
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    clearSearch
  } = useDocumentationSearch(sections);

  // Load documentation data
  useEffect(() => {
    setSections(documentationData.sections);
    
    // Set initially expanded sections
    const initiallyExpanded = documentationData.sections
      .filter(section => section.defaultExpanded)
      .map(section => section.id);
    setExpandedSections(new Set(initiallyExpanded));
  }, []);

  // Handle search result click
  const handleSearchResultClick = (result: SearchResult) => {
    setSelectedSection(result.sectionId);
    setExpandedSections(prev => new Set([...prev, result.sectionId]));
    
    // Scroll to section after a brief delay
    setTimeout(() => {
      const element = document.getElementById(`section-${result.sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Handle bookmark toggle
  const handleBookmark = (sectionId: string) => {
    setBookmarkedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Handle export section
  const handleExport = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      const content = `# ${section.title}\n\n${section.content.map(block => 
        block.type === 'formula' ? 
          `## ${block.data.name}\n${block.data.description}\n**Formula:** ${block.data.formula}` :
          block.type === 'changelog' ?
          `## ${block.data.title}\n${block.data.description}` :
          String(block.data)
      ).join('\n\n')}`;
      
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${section.title.toLowerCase().replace(/\s+/g, '-')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Handle section toggle
  const handleSectionToggle = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Filter sections based on search
  const filteredSections = searchQuery ? 
    sections.filter(section => 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.some(block => 
        JSON.stringify(block.data).toLowerCase().includes(searchQuery.toLowerCase())
      )
    ) : sections;

  return (
    <PageWrapper maxW="6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-card-foreground">
            Documentation & Formulas
          </h1>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            Comprehensive documentation for the Helpdesk Management System,
            including system architecture, data management, analytics formulas,
            and technical specifications.
          </p>
        </div>

        {/* Search and Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                onResultClick={handleSearchResultClick}
                onClearSearch={clearSearch}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedSections(new Set(sections.map(s => s.id)))}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Expand All
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedSections(new Set())}
              >
                Collapse All
              </Button>
            </div>
          </div>

          {/* Search Results Summary */}
          {searchQuery && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                Found {searchResults.length} results for "{searchQuery}"
              </span>
              <Badge variant="outline">
                {filteredSections.length} sections
              </Badge>
            </div>
          )}

          {/* Bookmarked Sections */}
          {bookmarkedSections.size > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <BookmarkCheck className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Bookmarked:</span>
              <div className="flex gap-1">
                {Array.from(bookmarkedSections).map(sectionId => {
                  const section = sections.find(s => s.id === sectionId);
                  return section ? (
                    <Badge 
                      key={sectionId}
                      variant="secondary"
                      className="cursor-pointer hover:bg-blue-100"
                      onClick={() => setSelectedSection(sectionId)}
                    >
                      {section.title}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Documentation Sections */}
        <div className="space-y-4">
          {filteredSections.map((section) => (
            <div 
              key={section.id}
              id={`section-${section.id}`}
              className={`transition-all duration-200 ${
                selectedSection === section.id ? 'ring-2 ring-blue-500 rounded-lg' : ''
              }`}
            >
              <EnhancedCollapsibleSection
                section={{
                  ...section,
                  defaultExpanded: expandedSections.has(section.id)
                }}
                isBookmarked={bookmarkedSections.has(section.id)}
                onBookmark={handleBookmark}
                onExport={handleExport}
                searchQuery={searchQuery}
              >
                <ContentRenderer 
                  content={section.content} 
                  searchQuery={searchQuery}
                />
              </EnhancedCollapsibleSection>
            </div>
          ))}
        </div>

        {/* No Results */}
        {searchQuery && filteredSections.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground mb-4">
              No sections match your search for "{searchQuery}"
            </p>
            <Button onClick={clearSearch} variant="outline">
              Clear Search
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-6 mt-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Last updated: {new Date().toLocaleDateString()}
            </div>
            <div className="flex items-center gap-4">
              <span>Version: 2.3.0</span>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
