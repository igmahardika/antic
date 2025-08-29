import PageWrapper from '../components/PageWrapper';
import CollapsibleSection from '../components/CollapsibleSection';
import { Badge } from '../components/ui/badge';
import { 
  UpdateIcon,
  DashboardIcon,
  AdminPanelSettingsIcon,
  LightbulbIcon,
  CodeIcon,
  PaletteIcon,
  SpeedIcon,
  BugReportIcon
} from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function AdminRumus() {
  return (
    <PageWrapper>
      <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-card-foreground">
            Documentation & Formulas
        </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Comprehensive documentation for the Helpdesk Management System, including 
            system architecture, data management, analytics formulas, and technical specifications.
        </p>
            </div>
            
        {/* === 1. CHANGELOG & RECENT UPDATES === */}
        <CollapsibleSection 
          title="Changelog & Recent Updates"
          icon={<UpdateIcon className="text-green-600" />}
          defaultExpanded={true}
        >
          <div className="space-y-8">
            {/* Latest Major Update */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 ring-1 ring-green-200 dark:ring-green-800">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-green-600 text-white px-3 py-1">Latest</Badge>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">v2.1.0 - Major Improvements</span>
                <span className="text-xs text-muted-foreground">December 2024</span>
              </div>
              <h4 className="font-bold text-lg text-card-foreground mb-4">Major System Overhaul & Optimization</h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* UI/UX Improvements */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-card-foreground flex items-center gap-2">
                    <PaletteIcon className="text-purple-600" />
                    UI/UX Enhancements
                  </h5>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Sidebar Navigation:</strong> Added shadcn-ui sidebar with collapsible menus</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Dark Mode:</strong> Comprehensive dark mode with smooth transitions</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Layout Consistency:</strong> PageWrapper component for uniform layout</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Header Enhancement:</strong> Moved avatar & mode toggle to header</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Progress Bars:</strong> Standardized all progress bars to shadcn Progress</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Responsive Design:</strong> Improved mobile and tablet experience</li>
                  </ul>
                </div>

                {/* Performance Optimizations */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-card-foreground flex items-center gap-2">
                    <SpeedIcon className="text-blue-600" />
                    Performance & Optimization
                  </h5>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Bundle Size:</strong> Removed 20+ unused dependencies</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Build Time:</strong> Faster compilation and build process</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Memory Usage:</strong> Optimized component re-rendering</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Charts Performance:</strong> Enhanced Recharts animations</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Tree Shaking:</strong> Better dependency optimization</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Loading Speed:</strong> Improved initial page load time</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Previous Updates Summary */}
            <div className="space-y-4">
              <h5 className="font-semibold text-card-foreground">Previous Updates</h5>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-blue-600 text-white px-2 py-1 text-xs">v2.0.0</Badge>
                  <div>
                    <div className="font-medium text-sm">Advanced Export Functionality</div>
                    <div className="text-xs text-muted-foreground">Enhanced data export with multiple formats</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-purple-600 text-white px-2 py-1 text-xs">v1.9.0</Badge>
                  <div>
                    <div className="font-medium text-sm">TypeScript Migration</div>
                    <div className="text-xs text-muted-foreground">Complete TypeScript implementation</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-orange-600 text-white px-2 py-1 text-xs">v1.8.0</Badge>
                  <div>
                    <div className="font-medium text-sm">Analytics Dashboard</div>
                    <div className="text-xs text-muted-foreground">Comprehensive analytics and reporting</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* REST OF FILE WILL BE COPIED */}
      </div>
    </PageWrapper>
  );
}
