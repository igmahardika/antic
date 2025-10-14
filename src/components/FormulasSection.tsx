import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Bookmark, Clock, Download, Share2 } from 'lucide-react';

interface FormulasSectionProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  estimatedReadTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  lastUpdated?: string;
  tags?: string[];
  bookmarked?: boolean;
  onBookmark?: (id: string) => void;
  onShare?: (id: string) => void;
  onExport?: (id: string) => void;
}

export default function FormulasSection({
  id,
  title,
  icon,
  children,
  estimatedReadTime,
  difficulty,
  lastUpdated,
  tags = [],
  bookmarked = false,
  onBookmark,
  onShare,
  onExport
}: FormulasSectionProps) {
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card className="w-full" id={id}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                {estimatedReadTime && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    {estimatedReadTime}
                  </div>
                )}
                {difficulty && (
                  <Badge className={`text-xs ${getDifficultyColor(difficulty)}`}>
                    {difficulty}
                  </Badge>
                )}
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Updated {lastUpdated}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {tags.map((tag) => (
              <Badge key={tag} className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                {tag}
              </Badge>
            ))}
            
            <div className="flex items-center gap-1">
              {onBookmark && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onBookmark(id)}
                  className="h-8 w-8 p-0"
                >
                  <Bookmark className={`h-4 w-4 ${
                    bookmarked ? 'text-yellow-500 fill-current' : 'text-gray-400'
                  }`} />
                </Button>
              )}
              
              {onShare && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShare(id)}
                  className="h-8 w-8 p-0"
                >
                  <Share2 className="h-4 w-4 text-gray-400" />
                </Button>
              )}
              
              {onExport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExport(id)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4 text-gray-400" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
