// Documentation types for AdminRumus modernization
import React from 'react';
export interface DocumentationSection {
  id: string;
  title: string;
  icon: string | React.ReactNode;
  defaultExpanded: boolean;
  content: ContentBlock[];
  lastUpdated: string;
  version: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relatedSections: string[];
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'formula' | 'code' | 'list' | 'table' | 'changelog' | 'metric';
  data: any;
  metadata?: {
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    relatedSections: string[];
    lastUpdated: string;
  };
}

export interface FormulaData {
  name: string;
  formula: string;
  description: string;
  dataSource: string[];
  example: {
    inputs: Record<string, any>;
    calculation: string;
    result: string;
  };
  target?: string;
  category: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch' | 'hotfix';
  title: string;
  description: string;
  features: string[];
  improvements: string[];
  fixes: string[];
  breaking?: string[];
}

export interface MetricData {
  name: string;
  description: string;
  formula: string;
  target: string;
  category: string;
  importance: 'high' | 'medium' | 'low';
}

export interface DocumentationVersion {
  version: string;
  releaseDate: string;
  changes: ChangelogEntry[];
  sections: string[];
  isLatest: boolean;
}

export interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  contentId: string;
  contentTitle: string;
  excerpt: string;
  relevanceScore: number;
  type: string;
}
