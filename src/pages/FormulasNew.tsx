import React, { useState, useEffect } from 'react';
import PageWrapper from '../components/PageWrapper';
import FormulasNavigation from '../components/FormulasNavigation';
import FormulasSection from '../components/FormulasSection';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  UpdateIcon, 
  DashboardIcon, 
  StorageIcon, 
  LightbulbIcon, 
  CodeIcon,
  Search,
  Filter,
  Bookmark,
  Download,
  Share2
} from 'lucide-react';

export default function FormulasNew() {
  const [currentSection, setCurrentSection] = useState('changelog');
  const [bookmarkedSections, setBookmarkedSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Mock data for sections
  const sections = [
    {
      id: 'changelog',
      title: 'Changelog & Recent Updates',
      icon: <UpdateIcon className="text-green-600" />,
      difficulty: 'beginner' as const,
      estimatedReadTime: '5 min',
      lastUpdated: '2024-12-01',
      tags: ['Updates', 'News'],
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 ring-1 ring-green-200 dark:ring-green-800">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-600 text-white px-3 py-1">Latest</Badge>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                v2.3.0 - Summary Dashboard Enhancement & Visual Optimization
              </span>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-green-800 dark:text-green-200">🎨 Visual Enhancements</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                <li>Redesigned summary cards with modern Material Design</li>
                <li>Improved color contrast and accessibility</li>
                <li>Enhanced responsive layout for mobile devices</li>
                <li>Added dark mode support for all components</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'overview',
      title: 'System Overview',
      icon: <DashboardIcon className="text-blue-600" />,
      difficulty: 'beginner' as const,
      estimatedReadTime: '10 min',
      lastUpdated: '2024-11-28',
      tags: ['Architecture', 'Overview'],
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">System Architecture</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                The Helpdesk Management System is built using modern web technologies with a focus on performance and scalability.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Key Features</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Real-time analytics, automated reporting, and comprehensive data management capabilities.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-management',
      title: 'Data Management',
      icon: <StorageIcon className="text-gray-600" />,
      difficulty: 'intermediate' as const,
      estimatedReadTime: '15 min',
      lastUpdated: '2024-11-25',
      tags: ['Data', 'Management'],
      content: (
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Data Storage</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">IndexedDB</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Client-side storage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">MySQL</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Server-side storage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">Redis</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Caching layer</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'technical-specs',
      title: 'Technical Specifications',
      icon: <LightbulbIcon className="text-yellow-600" />,
      difficulty: 'intermediate' as const,
      estimatedReadTime: '20 min',
      lastUpdated: '2024-11-20',
      tags: ['Technical', 'Specifications'],
      content: (
        <div className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-4">Performance Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">Load Time</div>
                <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">< 2s</div>
              </div>
              <div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">Bundle Size</div>
                <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">< 2MB</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'advanced-formulas',
      title: 'Advanced Technical Documentation & Calculation Formulas',
      icon: <CodeIcon className="text-purple-600" />,
      difficulty: 'advanced' as const,
      estimatedReadTime: '30 min',
      lastUpdated: '2024-11-15',
      tags: ['Advanced', 'Formulas', 'Calculations'],
      content: (
        <div className="space-y-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-4">Calculation Formulas</h4>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Response Time Calculation</h5>
                <code className="text-sm text-gray-600 dark:text-gray-400">
                  Response Time = Close Time - Open Time
                </code>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">SLA Calculation</h5>
                <code className="text-sm text-gray-600 dark:text-gray-400">
                  SLA = (Resolved within SLA / Total Tickets) × 100%
                </code>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleBookmark = (sectionId: string) => {
    setBookmarkedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleShare = (sectionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    navigator.clipboard.writeText(url);
    // Show toast notification
  };

  const handleExport = (sectionId: string) => {
    // Implement export functionality
    console.log('Exporting section:', sectionId);
  };

  const currentSectionData = sections.find(s => s.id === currentSection);

  return (
    <PageWrapper maxW="6xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <FormulasNavigation
            onNavigate={setCurrentSection}
            currentSection={currentSection}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-card-foreground">
                  Documentation & Formulas
                </h1>
                <p className="text-muted-foreground mt-2">
                  Comprehensive documentation for the Helpdesk Management System
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Current Section */}
            {currentSectionData && (
              <FormulasSection
                id={currentSectionData.id}
                title={currentSectionData.title}
                icon={currentSectionData.icon}
                difficulty={currentSectionData.difficulty}
                estimatedReadTime={currentSectionData.estimatedReadTime}
                lastUpdated={currentSectionData.lastUpdated}
                tags={currentSectionData.tags}
                bookmarked={bookmarkedSections.includes(currentSectionData.id)}
                onBookmark={handleBookmark}
                onShare={handleShare}
                onExport={handleExport}
              >
                {currentSectionData.content}
              </FormulasSection>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
