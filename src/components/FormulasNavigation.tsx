import { useState, useMemo } from 'react';
import { Search, Bookmark, Clock, ChevronRight } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface NavigationItem {
  id: string;
  title: string;
  section: string;
  estimatedReadTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lastUpdated: string;
  bookmarked?: boolean;
}

interface FormulasNavigationProps {
  onNavigate: (sectionId: string) => void;
  currentSection?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'changelog',
    title: 'Changelog & Recent Updates',
    section: 'Updates',
    estimatedReadTime: '5 min',
    difficulty: 'beginner',
    lastUpdated: '2024-12-01'
  },
  {
    id: 'overview',
    title: 'System Overview',
    section: 'Architecture',
    estimatedReadTime: '10 min',
    difficulty: 'beginner',
    lastUpdated: '2024-11-28'
  },
  {
    id: 'data-management',
    title: 'Data Management',
    section: 'Architecture',
    estimatedReadTime: '15 min',
    difficulty: 'intermediate',
    lastUpdated: '2024-11-25'
  },
  {
    id: 'technical-specs',
    title: 'Technical Specifications',
    section: 'Technical',
    estimatedReadTime: '20 min',
    difficulty: 'intermediate',
    lastUpdated: '2024-11-20'
  },
  {
    id: 'advanced-formulas',
    title: 'Advanced Technical Documentation & Calculation Formulas',
    section: 'Technical',
    estimatedReadTime: '30 min',
    difficulty: 'advanced',
    lastUpdated: '2024-11-15'
  }
];

export default function FormulasNavigation({ onNavigate, currentSection }: FormulasNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return navigationItems;
    
    return navigationItems.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.section.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const toggleBookmark = (itemId: string) => {
    setBookmarkedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="w-full lg:w-80 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Progress Indicator */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Reading Progress</span>
          <span className="text-xs text-gray-500">0%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '0%' }}></div>
        </div>
      </div>

      {/* Navigation Items */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                currentSection === item.id
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => onNavigate(item.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{item.title}</h4>
                    {bookmarkedItems.includes(item.id) && (
                      <Bookmark className="h-3 w-3 text-yellow-500 fill-current" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                      {item.section}
                    </Badge>
                    <Badge className={`text-xs ${getDifficultyColor(item.difficulty)}`}>
                      {item.difficulty}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.estimatedReadTime}
                    </div>
                    <span>Updated {item.lastUpdated}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(item.id);
                    }}
                  >
                    <Bookmark className={`h-3 w-3 ${
                      bookmarkedItems.includes(item.id) 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-400'
                    }`} />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start" size="sm">
          <Bookmark className="h-4 w-4 mr-2" />
          View Bookmarks
        </Button>
        <Button variant="outline" className="w-full justify-start" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          Reading History
        </Button>
      </div>
    </div>
  );
}
