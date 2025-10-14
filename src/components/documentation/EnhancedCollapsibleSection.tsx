import React, { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ChevronDown, Bookmark, BookmarkCheck, Download } from "lucide-react";
import { Badge } from "../ui/badge";
import type { DocumentationSection } from "../../types/documentation";

interface EnhancedCollapsibleSectionProps {
  section: DocumentationSection;
  children: React.ReactNode;
  onBookmark?: (sectionId: string) => void;
  onExport?: (sectionId: string) => void;
  isBookmarked?: boolean;
  searchQuery?: string;
}

export default function EnhancedCollapsibleSection({
  section,
  children,
  onBookmark,
  onExport,
  isBookmarked = false,
  searchQuery = "",
}: EnhancedCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(section.defaultExpanded);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark?.(section.id);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExport?.(section.id);
  };

  const highlightSearchQuery = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex w-full items-center justify-between rounded-lg bg-card px-4 py-3 text-left text-sm font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-lg">{section.icon}</span>
          <div className="flex-1">
            <div 
              className="font-semibold"
              dangerouslySetInnerHTML={{ 
                __html: highlightSearchQuery(section.title) 
              }}
            />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                v{section.version}
              </Badge>
              <Badge 
                variant={section.difficulty === 'advanced' ? 'danger' : 
                        section.difficulty === 'intermediate' ? 'warning' : 'info'}
                className="text-xs"
              >
                {section.difficulty}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Updated: {new Date(section.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleBookmark}
            className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-blue-600" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
          
          <button
            onClick={handleExport}
            className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Export section"
          >
            <Download className="h-4 w-4" />
          </button>
          
          <CollapsibleTrigger asChild>
            <button className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
        </div>
      </div>
      
      <CollapsibleContent className="space-y-2">
        <div className="px-4 pb-4 pt-2">
          {/* Section metadata */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap gap-2 mb-2">
              {section.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            {section.relatedSections.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <strong>Related:</strong> {section.relatedSections.join(", ")}
              </div>
            )}
          </div>
          
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
