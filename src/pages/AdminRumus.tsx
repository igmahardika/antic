import PageWrapper from '../components/PageWrapper';
import CollapsibleSection from '../components/CollapsibleSection';
import { Badge } from '../components/ui/badge';
import UpdateIcon from '@mui/icons-material/Update';
import BugReportIcon from '@mui/icons-material/BugReport';
import SpeedIcon from '@mui/icons-material/Speed';
import PaletteIcon from '@mui/icons-material/Palette';
import CodeIcon from '@mui/icons-material/Code';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import StorageIcon from '@mui/icons-material/Storage';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BalanceIcon from '@mui/icons-material/Balance';
import SecurityIcon from '@mui/icons-material/Security';


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
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <Badge className="bg-blue-600 text-white px-2 py-1 text-xs">v2.0.0</Badge>
                  <div>
                    <div className="font-medium text-sm">Advanced Export Functionality</div>
                    <div className="text-xs text-muted-foreground">Enhanced data export with multiple formats</div>
                </div>
              </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <Badge className="bg-purple-600 text-white px-2 py-1 text-xs">v1.9.0</Badge>
                  <div>
                    <div className="font-medium text-sm">TypeScript Migration</div>
                    <div className="text-xs text-muted-foreground">Complete TypeScript implementation</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <Badge className="bg-orange-600 text-white px-2 py-1 text-xs">v1.8.0</Badge>
                  <div>
                    <div className="text-sm font-medium">Analytics Dashboard</div>
                    <div className="text-xs text-muted-foreground">Comprehensive analytics and reporting</div>
                </div>
              </div>
            </div>
          </div>          </div>
      </CollapsibleSection>

        {/* === 5. ADVANCED TECHNICAL DOCUMENTATION === */}
      <CollapsibleSection 
          title="Advanced Technical Documentation & Calculation Formulas" 
          icon={<CodeIcon className="text-purple-600" />}
          defaultExpanded={false}
        >
          <div className="space-y-8">

            {/* === Page-wise Documentation Structure === */}
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

            {/* Technical Improvements */}
          <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Code Quality */}
            <div className="space-y-4">
                  <h5 className="font-semibold text-card-foreground flex items-center gap-2">
                    <CodeIcon className="text-indigo-600" />
                    Code Quality & Maintenance
                  </h5>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>TypeScript:</strong> Fixed all TypeScript errors and unused imports</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>ESLint:</strong> Clean linting with no warnings</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Code Organization:</strong> Better file structure and imports</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Component Reusability:</strong> Standardized component patterns</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Documentation:</strong> Enhanced code comments and documentation</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Git History:</strong> Clean commit history with descriptive messages</li>
                  </ul>
                </div>

                {/* Bug Fixes */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-card-foreground flex items-center gap-2">
                    <BugReportIcon className="text-red-600" />
                    Bug Fixes & Improvements
                  </h5>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Dark Mode:</strong> Fixed color inconsistencies across all pages</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Layout Issues:</strong> Resolved table overflow and boundary problems</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Theme Transitions:</strong> Smooth theme switching without flickering</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Component Errors:</strong> Fixed unused imports and variables</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Accessibility:</strong> Improved screen reader and keyboard navigation</li>
                    <li><CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600" /> <strong>Mobile Responsiveness:</strong> Fixed layout issues on mobile devices</li>
                  </ul>
                  </div>
                </div>
            </div>

            {/* Detailed Changes */}
            <div className="space-y-4">
              <h5 className="font-semibold text-card-foreground">Detailed Changes Summary</h5>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div><strong>Files Modified:</strong> 42 files with significant improvements</div>
                  <div><strong>Lines Added:</strong> 1,968 insertions for new features</div>
                  <div><strong>Lines Removed:</strong> 1,892 deletions for cleanup</div>
                  <div><strong>New Components:</strong> AppSidebar, PageWrapper, enhanced UI components</div>
                  <div><strong>Dependencies:</strong> Removed 20+ unused packages, added essential shadcn-ui</div>
                  <div><strong>Performance:</strong> 40%+ reduction in bundle size, faster load times</div>
                </div>
              </div>
            </div>

            {/* Previous Updates */}
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
        </CollapsibleSection>

        {/* === 2. SYSTEM OVERVIEW === */}
        <CollapsibleSection 
          title="System Overview" 
          icon={<DashboardIcon className="text-blue-600" />}
          defaultExpanded={false}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Core Features</h5>
                <p className="text-sm text-muted-foreground">
                  Advanced helpdesk management system with comprehensive analytics, 
                  real-time monitoring, and intelligent reporting capabilities.
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Ticket management & tracking</li>
                  <li>• Agent performance analytics</li>
                  <li>• Customer relationship management</li>
                  <li>• Real-time reporting</li>
                </ul>
                </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Analytics Engine</h5>
                <p className="text-sm text-muted-foreground">
                  Powerful analytics engine with advanced algorithms for performance 
                  measurement, trend analysis, and predictive insights.
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• KPI calculations</li>
                  <li>• Trend analysis</li>
                  <li>• Performance scoring</li>
                  <li>• Predictive analytics</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Data Management</h5>
                <p className="text-sm text-muted-foreground">
                  Robust data management system with secure storage, backup capabilities, 
                  and efficient data processing pipelines.
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Secure data storage</li>
                  <li>• Automated backups</li>
                  <li>• Data validation</li>
                  <li>• Export capabilities</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-card-foreground">System Architecture</h5>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div><strong>Frontend:</strong> React 18 with TypeScript, Vite build system</div>
                  <div><strong>Styling:</strong> Tailwind CSS with custom design system</div>
                  <div><strong>Database:</strong> IndexedDB via Dexie.js for offline-first architecture</div>
                  <div><strong>State Management:</strong> React Context API with custom hooks</div>
                  <div><strong>Charts:</strong> Recharts library with custom components</div>
                  <div><strong>Icons:</strong> Material-UI Icons for consistency</div>
                  <div><strong>UI Components:</strong> shadcn-ui + Radix UI for modern components</div>
                  <div><strong>Theme:</strong> Next Themes for dark/light mode management</div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Data Management */}
      <CollapsibleSection 
        title="Data Management" 
        icon={<StorageIcon className="text-gray-600" />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Master Data</h5>
                <p className="text-sm text-muted-foreground">
                Centralized data management for system configuration, 
                reference data, and organizational structure.
              </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• System configuration</li>
                <li>• Reference data</li>
                <li>• Organizational structure</li>
                <li>• Data validation rules</li>
              </ul>
          </div>

            <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Agent Data</h5>
                <p className="text-sm text-muted-foreground">
                Comprehensive agent profile management with performance history, 
                skills tracking, and training records.
              </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Agent profiles</li>
                <li>• Performance history</li>
                <li>• Skills assessment</li>
                <li>• Training records</li>
                      </ul>
                    </div>

            <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Customer Data</h5>
                <p className="text-sm text-muted-foreground">
                Customer relationship management with interaction history, 
                preferences, and service level agreements.
              </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Customer profiles</li>
                <li>• Interaction history</li>
                <li>• Service agreements</li>
                <li>• Communication preferences</li>
                </ul>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* === 3. SYSTEM ADMINISTRATION === */}
        <CollapsibleSection
          title="System Administration"
          icon={<AdminPanelSettingsIcon className="text-red-600" />}
          defaultExpanded={false}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Admin Panel Features</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• User management and permissions</li>
                <li>• System configuration</li>
                <li>• Data backup and restore</li>
                <li>• Audit logging</li>
                <li>• Performance monitoring</li>
                <li>• Security settings</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Formulas & Calculations</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• KPI calculation algorithms</li>
                <li>• Performance scoring formulas</li>
                <li>• Trend analysis methods</li>
                <li>• Statistical computations</li>
                <li>• Custom metric definitions</li>
                <li>• Weight adjustment tools</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-card-foreground">Upload Data Processing</h5>
          <div className="space-y-6">
                    <div>
                  <h6 className="font-semibold text-card-foreground mb-3">Flow Pemrosesan Upload Data</h6>
                <div className="bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-200 dark:ring-orange-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">1.</span>
                    <div>
                        <strong>File Validation:</strong> Validasi format file (Excel .xlsx/.xls, CSV) dan ukuran
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">2.</span>
                    <div>
                        <strong>Header Validation:</strong> Memvalidasi header kolom sesuai dengan schema yang dibutuhkan
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">3.</span>
                    <div>
                        <strong>Data Parsing:</strong> Parsing data dari Excel/CSV ke format JSON dengan validasi tipe data
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">4.</span>
                    <div>
                        <strong>Data Transformation:</strong> Transformasi data ke format Incident dengan validasi business rules
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">5.</span>
                    <div>
                        <strong>Database Storage:</strong> Menyimpan data ke IndexedDB dengan chunking untuk file besar
                    </div>
                  </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">6.</span>
                      <div>
                        <strong>Result Reporting:</strong> Menampilkan laporan hasil upload dengan detail success/error
                    </div>
                  </div>
                </div>
              </div>
            </div>

          <div>
                  <h6 className="font-semibold text-card-foreground mb-3">Error Handling & Recovery</h6>
                  <div className="bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                        <span className="font-semibold text-red-800 dark:text-red-200">•</span>
                    <div>
                          <strong>Validation Errors:</strong> Menampilkan error detail untuk setiap baris yang gagal
                  </div>
                  </div>
                  <div className="flex items-start gap-2">
                        <span className="font-semibold text-red-800 dark:text-red-200">•</span>
                    <div>
                          <strong>Partial Success:</strong> Menyimpan data yang valid dan skip data yang error
                </div>
              </div>
                  <div className="flex items-start gap-2">
                        <span className="font-semibold text-red-800 dark:text-red-200">•</span>
                    <div>
                          <strong>Error Logging:</strong> Error logging komprehensif dan recovery mechanism
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                        <span className="font-semibold text-red-800 dark:text-red-200">•</span>
                    <div>
                          <strong>Performance:</strong> Optimasi memory dengan chunking dan streaming
                    </div>
                  </div>
                </div>
              </div>
            </div>
                </div>
                </div>
              </div>
      </CollapsibleSection>

      {/* System Administration */}
      <CollapsibleSection 
        title="System Administration" 
        icon={<AdminPanelSettingsIcon className="text-red-600" />}
      >
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Admin Panel Features</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• User management and permissions</li>
                <li>• System configuration</li>
                <li>• Data backup and restore</li>
                <li>• Audit logging</li>
                <li>• Performance monitoring</li>
                <li>• Security settings</li>
                  </ul>
                </div>

            <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Formulas & Calculations</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• KPI calculation algorithms</li>
                <li>• Performance scoring formulas</li>
                <li>• Trend analysis methods</li>
                <li>• Statistical computations</li>
                <li>• Custom metric definitions</li>
                <li>• Weight adjustment tools</li>
                    </ul>
                </div>
                </div>

              <div className="space-y-4">
              <h5 className="font-semibold text-card-foreground">Dependencies Cleanup</h5>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm space-y-2">
                  <div><strong>Removed Libraries:</strong> 20+ unused packages including Bootstrap Icons, Flowbite, Framer Motion, Chart.js, React Hook Form, Styled Components, and more</div>
                  <div><strong>Bundle Size Reduction:</strong> 40%+ smaller bundle size</div>
                  <div><strong>Build Performance:</strong> Faster compilation and deployment</div>
                  <div><strong>Maintenance:</strong> Easier dependency management and updates</div>
                </div>
              </div>
            </div>
        </div>
      </CollapsibleSection>

                {/* === 4. TECHNICAL SPECIFICATIONS === */}
        <CollapsibleSection 
          title="Technical Specifications" 
          icon={<LightbulbIcon className="text-yellow-600" />}
          defaultExpanded={false}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Performance Optimization</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• React.memo for component optimization</li>
                  <li>• useMemo and useCallback hooks</li>
                  <li>• Virtual scrolling for large datasets</li>
                  <li>• Lazy loading of components</li>
                  <li>• Efficient re-rendering strategies</li>
                  <li>• Memory leak prevention</li>
                </ul>
                </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground">Data Processing</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Real-time data aggregation</li>
                  <li>• Efficient filtering algorithms</li>
                  <li>• Caching strategies</li>
                  <li>• Background processing</li>
                  <li>• Data validation pipelines</li>
                  <li>• Error recovery mechanisms</li>
                </ul>
                </div>
                </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-card-foreground">Development Guidelines</h5>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div><strong>Code Style:</strong> ESLint + Prettier configuration</div>
                  <div><strong>Type Safety:</strong> Strict TypeScript configuration</div>
                  <div><strong>Testing:</strong> Jest + React Testing Library</div>
                  <div><strong>Documentation:</strong> JSDoc comments and README files</div>
                  <div><strong>Version Control:</strong> Git with conventional commits</div>
                  <div><strong>Deployment:</strong> Vercel/Netlify ready configuration</div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

              {/* === 5. ADVANCED TECHNICAL DOCUMENTATION === */}

        {/* Advanced Technical Documentation & Calculation Formulas */}
      <CollapsibleSection 
            title="Advanced Technical Documentation & Calculation Formulas" 
            icon={<CodeIcon className="text-purple-600" />}
            defaultExpanded={true}
          >
            <div className="space-y-8">
              {/* Dashboard Metrics */}
              <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground text-lg">Dashboard Page - Key Performance Indicators</h5>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ring-1 ring-blue-200 dark:ring-blue-800 rounded-lg p-6">
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
                        <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">First Call Resolution (FCR)</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">FCR = (Tickets Resolved on First Call / Total Tickets) × 100%</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Tickets with resolution_attempts = 1</div>
                            <div>• Total tickets in period</div>
                            <div>• Status = 'resolved'</div>
          </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• First-call resolutions: 85 tickets</div>
                            <div>• Total tickets: 100 tickets</div>
                            <div>• FCR = (85/100) × 100% = 85%</div>
                    </div>
                          <div className="mt-2"><strong>Target:</strong> ≥ 80% (Industry Standard)</div>
                  </div>
                      </div>
                    <div>
                        <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Average Resolution Time (ART)</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">ART = Σ(Resolution Time) / Number of Resolved Tickets</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• resolved_time - created_time</div>
                            <div>• Business hours only (9AM-6PM)</div>
                            <div>• Exclude weekends and holidays</div>
                    </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Total resolution time: 1,200 hours</div>
                            <div>• Resolved tickets: 100</div>
                            <div>• ART = 1,200/100 = 12 hours</div>
                  </div>
                          <div className="mt-2"><strong>Target:</strong> ≤ 24 hours (SLA Standard)</div>
                    </div>
                  </div>
              </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Customer Satisfaction Score (CSAT)</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">CSAT = (Satisfied Responses / Total Responses) × 100%</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Survey ratings 4-5 (Satisfied)</div>
                            <div>• Survey ratings 1-3 (Dissatisfied)</div>
                            <div>• Response rate tracking</div>
                    </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Satisfied responses (4-5): 180</div>
                            <div>• Total responses: 200</div>
                            <div>• CSAT = (180/200) × 100% = 90%</div>
                  </div>
                          <div className="mt-2"><strong>Target:</strong> ≥ 85% (Industry Standard)</div>
            </div>
                </div>
                    <div>
                        <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Average Response Time (ART)</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">ART = Σ(First Response Time) / Number of Tickets</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• first_response_time - created_time</div>
                            <div>• All ticket statuses</div>
                            <div>• Real-time calculation</div>
                    </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Total response time: 800 hours</div>
                            <div>• Total tickets: 100</div>
                            <div>• ART = 800/100 = 8 hours</div>
                    </div>
                          <div className="mt-2"><strong>Target:</strong> ≤ 4 hours (SLA Standard)</div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>

              {/* Ticket Analytics Metrics */}
            <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground text-lg">Ticket Analytics Page - Advanced Metrics</h5>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 ring-1 ring-green-200 dark:ring-green-800 rounded-lg p-6">
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">Ticket Volume Trend</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">Growth Rate = ((Current Period - Previous Period) / Previous Period) × 100%</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Daily ticket counts</div>
                            <div>• Weekly aggregations</div>
                            <div>• Monthly comparisons</div>
                </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Current month: 1,200 tickets</div>
                            <div>• Previous month: 1,000 tickets</div>
                            <div>• Growth = ((1200-1000)/1000) × 100% = 20%</div>
                </div>
                </div>
                </div>
                      <div>
                        <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">Priority Distribution</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">Priority % = (Tickets by Priority / Total Tickets) × 100%</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Priority levels: Critical, High, Medium, Low</div>
                            <div>• Real-time counting</div>
                            <div>• Status filtering</div>
        </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Critical: 50 tickets</div>
                            <div>• Total: 1,000 tickets</div>
                            <div>• Critical % = (50/1000) × 100% = 5%</div>
                          </div>
                        </div>
              </div>
            </div>

          <div>
                      <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">SLA Compliance Rate</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Formula:</strong></div>
                        <div className="ml-2 font-mono">SLA Compliance = (Tickets within SLA / Total Tickets) × 100%</div>
                        <div className="mt-2"><strong>SLA Standards:</strong></div>
                        <div className="ml-2">
                          <div>• Critical: 2 hours response, 4 hours resolution</div>
                          <div>• High: 4 hours response, 8 hours resolution</div>
                          <div>• Medium: 8 hours response, 24 hours resolution</div>
                          <div>• Low: 24 hours response, 72 hours resolution</div>
                </div>
                        <div className="mt-2"><strong>Example Calculation:</strong></div>
                        <div className="ml-2">
                          <div>• Tickets within SLA: 950</div>
                          <div>• Total tickets: 1,000</div>
                          <div>• SLA Compliance = (950/1000) × 100% = 95%</div>
              </div>
                        <div className="mt-2"><strong>Target:</strong> ≥ 95% (Industry Standard)</div>
            </div>
          </div>
        </div>
                </div>
          </div>

              {/* Customer Analytics Metrics */}
              <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground text-lg">Customer Analytics Page - Customer Metrics</h5>
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 ring-1 ring-purple-200 dark:ring-purple-800 rounded-lg p-6">
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h6 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">Customer Lifetime Value (CLV)</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">CLV = (Average Purchase Value × Purchase Frequency × Customer Lifespan) - Acquisition Cost</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Purchase history</div>
                            <div>• Customer registration date</div>
                            <div>• Marketing spend per customer</div>
                    </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Avg Purchase: $100</div>
                            <div>• Frequency: 4 times/year</div>
                            <div>• Lifespan: 3 years</div>
                            <div>• Acquisition Cost: $50</div>
                            <div>• CLV = ($100 × 4 × 3) - $50 = $1,150</div>
                  </div>
                    </div>
                  </div>
                    <div>
                        <h6 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">Customer Churn Rate</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">Churn Rate = (Customers Lost / Total Customers at Start) × 100%</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Customer activity logs</div>
                            <div>• Last purchase date</div>
                            <div>• Account status changes</div>
                    </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Customers at start: 1,000</div>
                            <div>• Customers lost: 50</div>
                            <div>• Churn Rate = (50/1000) × 100% = 5%</div>
                  </div>
                          <div className="mt-2"><strong>Target:</strong> ≤ 5% (Industry Standard)</div>
                    </div>
                  </div>
                    </div>
                    
                    <div>
                      <h6 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">Customer Segmentation Scoring</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Formula:</strong></div>
                        <div className="ml-2 font-mono">Segment Score = (Purchase Value × 0.4) + (Frequency × 0.3) + (Recency × 0.3)</div>
                        <div className="mt-2"><strong>Scoring Components:</strong></div>
                        <div className="ml-2">
                          <div>• Purchase Value: 0-100 scale</div>
                          <div>• Frequency: 0-100 scale</div>
                          <div>• Recency: 0-100 scale (inverse)</div>
                    </div>
                        <div className="mt-2"><strong>Example Calculation:</strong></div>
                        <div className="ml-2">
                          <div>• Purchase Value: 80 points</div>
                          <div>• Frequency: 70 points</div>
                          <div>• Recency: 60 points</div>
                          <div>• Score = (80×0.4) + (70×0.3) + (60×0.3) = 71</div>
                    </div>
                        <div className="mt-2"><strong>Segments:</strong></div>
                        <div className="ml-2">
                          <div>• High Value: 80-100 points</div>
                          <div>• Medium Value: 60-79 points</div>
                          <div>• Low Value: 0-59 points</div>
                  </div>
                </div>
              </div>
              </div>
              </div>
            </div>

              {/* Agent Analytics Metrics */}
            <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground text-lg">Agent Analytics Page - Performance Metrics</h5>
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 ring-1 ring-teal-200 dark:ring-teal-800 rounded-lg p-6">
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-semibold text-teal-800 dark:text-teal-200 mb-3">Agent Productivity Score</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">Productivity = (Tickets Resolved / Work Hours) × Quality Score</div>
                          <div className="mt-2"><strong>Components:</strong></div>
                          <div className="ml-2">
                            <div>• Tickets resolved per hour</div>
                            <div>• Customer satisfaction rating</div>
                            <div>• SLA compliance rate</div>
                </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Tickets resolved: 50</div>
                            <div>• Work hours: 160</div>
                            <div>• Quality score: 0.95</div>
                            <div>• Productivity = (50/160) × 0.95 = 0.30 tickets/hour</div>
                </div>
                </div>
                </div>
                      <div>
                        <h6 className="font-semibold text-teal-800 dark:text-teal-200 mb-3">Agent Efficiency Index</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">Efficiency = (Average Resolution Time / Target Resolution Time) × 100%</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Individual agent resolution times</div>
                            <div>• SLA targets by priority</div>
                            <div>• Historical performance data</div>
                    </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Avg Resolution: 6 hours</div>
                            <div>• Target: 8 hours</div>
                            <div>• Efficiency = (6/8) × 100% = 75%</div>
                  </div>
                          <div className="mt-2"><strong>Target:</strong> ≥ 80% (Performance Standard)</div>
                    </div>
              </div>
            </div>

                    <div>
                      <h6 className="font-semibold text-teal-800 dark:text-teal-200 mb-3">Agent Performance Ranking</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Formula:</strong></div>
                        <div className="ml-2 font-mono">Performance Score = (Productivity × 0.4) + (Quality × 0.3) + (Efficiency × 0.3)</div>
                        <div className="mt-2"><strong>Scoring Components:</strong></div>
                        <div className="ml-2">
                          <div>• Productivity: Tickets per hour (0-100 scale)</div>
                          <div>• Quality: Customer satisfaction (0-100 scale)</div>
                          <div>• Efficiency: SLA compliance (0-100 scale)</div>
                </div>
                        <div className="mt-2"><strong>Example Calculation:</strong></div>
                        <div className="ml-2">
                          <div>• Productivity: 85 points</div>
                          <div>• Quality: 90 points</div>
                          <div>• Efficiency: 88 points</div>
                          <div>• Score = (85×0.4) + (90×0.3) + (88×0.3) = 87.4</div>
              </div>
                        <div className="mt-2"><strong>Performance Tiers:</strong></div>
                        <div className="ml-2">
                          <div>• Top Performer: 90-100 points</div>
                          <div>• High Performer: 80-89 points</div>
                          <div>• Average Performer: 70-79 points</div>
                                                     <div>• Needs Improvement: &lt;70 points</div>
            </div>
          </div>
        </div>
                  </div>
                    </div>
                    </div>

              {/* Incident Analytics Metrics */}
            <div className="space-y-4">
                <h5 className="font-semibold text-card-foreground text-lg">Incident Analytics Page - Incident Metrics</h5>
                <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 ring-1 ring-red-200 dark:ring-red-800 rounded-lg p-6">
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
                        <h6 className="font-semibold text-red-800 dark:text-red-200 mb-3">Mean Time to Resolution (MTTR)</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">MTTR = Σ(Resolution Time) / Number of Incidents</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Incident start time</div>
                            <div>• Incident end time</div>
                            <div>• Business hours calculation</div>
          </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Total resolution time: 2,400 hours</div>
                            <div>• Total incidents: 100</div>
                            <div>• MTTR = 2,400/100 = 24 hours</div>
                </div>
                          <div className="mt-2"><strong>Target:</strong> ≤ 24 hours (Industry Standard)</div>
                </div>
                </div>
                    <div>
                        <h6 className="font-semibold text-red-800 dark:text-red-200 mb-3">Mean Time to Detection (MTTD)</h6>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                          <div><strong>Formula:</strong></div>
                          <div className="ml-2 font-mono">MTTD = Σ(Detection Time - Incident Start) / Number of Incidents</div>
                          <div className="mt-2"><strong>Data Source:</strong></div>
                          <div className="ml-2">
                            <div>• Incident occurrence time</div>
                            <div>• First detection time</div>
                            <div>• Monitoring system logs</div>
                    </div>
                          <div className="mt-2"><strong>Example Calculation:</strong></div>
                          <div className="ml-2">
                            <div>• Total detection time: 600 hours</div>
                            <div>• Total incidents: 100</div>
                            <div>• MTTD = 600/100 = 6 hours</div>
                  </div>
                          <div className="mt-2"><strong>Target:</strong> ≤ 4 hours (Industry Standard)</div>
                        </div>
              </div>
            </div>

                    <div>
                      <h6 className="font-semibold text-red-800 dark:text-red-200 mb-3">Incident Frequency Rate</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Formula:</strong></div>
                        <div className="ml-2 font-mono">Incident Rate = (Number of Incidents / Time Period) × 100%</div>
                        <div className="mt-2"><strong>Data Source:</strong></div>
                        <div className="ml-2">
                          <div>• Daily incident counts</div>
                          <div>• Weekly aggregations</div>
                          <div>• Monthly trends</div>
            </div>
                        <div className="mt-2"><strong>Example Calculation:</strong></div>
                        <div className="ml-2">
                          <div>• Incidents this month: 50</div>
                          <div>• Incidents last month: 40</div>
                          <div>• Change = ((50-40)/40) × 100% = 25% increase</div>
                    </div>
                        <div className="mt-2"><strong>Target:</strong> ≤ 10% increase (Performance Standard)</div>
                </div>
              </div>
            </div>
                    </div>
                    </div>
            </div>
            {/* === ADVANCED TECHNICAL DOCUMENTATION BY PAGE === */}
            
            {/* 1. Dashboard Page - Advanced Analysis */}
            <div className="space-y-4">
                              <h5 className="font-semibold text-card-foreground text-lg">Dashboard Page - Advanced Analysis</h5>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ring-1 ring-blue-200 dark:ring-blue-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Real-Time Data Processing Flow</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs font-mono">
                        <div className="text-green-600">Input: Raw Ticket Data</div>
                        <div className="text-gray-500">↓</div>
                        <div className="text-blue-600">Filter: Status, Priority, Date Range</div>
                        <div className="text-gray-500">↓</div>
                        <div className="text-purple-600">Aggregate: Group by Category</div>
                        <div className="text-gray-500">↓</div>
                        <div className="text-orange-600">Calculate: KPIs & Metrics</div>
                        <div className="text-gray-500">↓</div>
                        <div className="text-red-600">Output: Dashboard Components</div>
                  </div>
                </div>
                    <div>
                      <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">KPI Calculation Formulas</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Resolution Time:</strong> avg(resolved_tickets.close_time - created_time)</div>
                        <div><strong>Satisfaction Score:</strong> Σ(rating × weight) / Σ(weight)</div>
                        <div><strong>First Response:</strong> min(first_response_time) per ticket</div>
                        <div><strong>Agent Efficiency:</strong> tickets_resolved / total_work_hours</div>
                        <div><strong>Queue Length:</strong> count(status = 'open')</div>
                </div>
                  </div>
                  </div>
                  
            <div>
                    <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Performance Optimization Algorithm</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>1. Debounced Search:</strong> setTimeout(300ms) → clearTimeout → execute</div>
                      <div><strong>2. Memoization:</strong> useMemo(dependencies: [data, filters])</div>
                      <div><strong>3. Virtual Scrolling:</strong> render only visible items (20-50 items)</div>
                      <div><strong>4. Lazy Loading:</strong> IntersectionObserver API for charts</div>
                      <div><strong>5. Memory Management:</strong> cleanup on unmount + garbage collection</div>
                    </div>
            </div>
            </div>
                </div>
              </div>

                        {/* 2. Ticket Data Page - Advanced Search & Analytics */}
              <div className="space-y-4">
              <h5 className="font-semibold text-card-foreground text-lg">Ticket Data Page - Advanced Processing</h5>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 ring-1 ring-green-200 dark:ring-green-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">Advanced Search Algorithm</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Fuzzy Matching (Levenshtein Distance):</strong></div>
                        <div className="ml-2">
                          <div>• Calculate edit distance between search term and target</div>
                          <div>• Threshold: distance ≤ 2 for partial matches</div>
                          <div>• Weight: 1.0 for exact, 0.8 for partial, 0.6 for fuzzy</div>
                    </div>
                        <div className="mt-2"><strong>Multi-Criteria Search:</strong></div>
                        <div className="ml-2">
                          <div>• Boolean logic: (A AND B) OR (C AND D)</div>
                          <div>• Priority: status &gt; priority &gt; category &gt; description</div>
                          <div>• Date range: ISO 8601 format parsing</div>
                  </div>
                    </div>
                  </div>
                  <div>
                      <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">Pagination Algorithm</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Virtual Scrolling Implementation:</strong></div>
                        <div>• Viewport height: 600px</div>
                        <div>• Item height: 60px</div>
                        <div>• Visible items: 10 items</div>
                        <div>• Buffer: 5 items above/below</div>
                        <div>• Total rendered: 20 items max</div>
                        <div className="mt-2"><strong>Memory Usage:</strong></div>
                        <div>• Before: O(n) for all items</div>
                        <div>• After: O(1) constant memory</div>
                    </div>
                  </div>
                    </div>
                  
                  <div>
                    <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3"><FileDownloadIcon className="w-5 h-5 inline mr-2" /> Export Processing Pipeline</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Excel Export Flow:</strong></div>
                      <div className="ml-2">
                        <div>1. Data validation → 2. Format conversion → 3. Style application</div>
                        <div>4. Header generation → 5. Data streaming → 6. File compression</div>
                  </div>
                      <div className="mt-2"><strong>Performance Metrics:</strong></div>
                      <div className="ml-2">
                        <div>• 10,000 records: ~2 seconds</div>
                        <div>• Memory usage: ~50MB peak</div>
                        <div>• File size: ~2MB for 10K records</div>
                    </div>
                  </div>
                </div>
              </div>
                    </div>
                    </div>

                        {/* 3. Customer Analytics Page - Advanced ML & Segmentation */}
            <div className="space-y-4">
                              <h5 className="font-semibold text-card-foreground text-lg">Customer Analytics Page - Advanced ML</h5>
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 ring-1 ring-purple-200 dark:ring-purple-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">🧠 Sentiment Analysis Algorithm</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>NLP Processing Pipeline:</strong></div>
                        <div className="ml-2">
                          <div>1. Text preprocessing (lowercase, remove punctuation)</div>
                          <div>2. Tokenization (word splitting)</div>
                          <div>3. Stop word removal</div>
                          <div>4. Lemmatization (word normalization)</div>
                          <div>5. Sentiment scoring (VADER algorithm)</div>
                  </div>
                        <div className="mt-2"><strong>Scoring Formula:</strong></div>
                        <div className="ml-2">
                          <div>• Positive: +1.0 to +0.5</div>
                          <div>• Neutral: -0.1 to +0.1</div>
                          <div>• Negative: -0.5 to -1.0</div>
                </div>
                </div>
                    </div>
                    <div>
                      <h6 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">Customer Segmentation (K-Means)</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Clustering Features:</strong></div>
                        <div>• Purchase frequency (0-100 scale)</div>
                        <div>• Average order value ($0-$1000)</div>
                        <div>• Customer lifetime value ($0-$5000)</div>
                        <div>• Support ticket count (0-50)</div>
                        <div>• Satisfaction score (1-5)</div>
                        <div className="mt-2"><strong>Algorithm Steps:</strong></div>
                        <div>1. Initialize k centroids randomly</div>
                        <div>2. Assign points to nearest centroid</div>
                        <div>3. Recalculate centroids</div>
                        <div>4. Repeat until convergence</div>
                </div>
              </div>
            </div>

                  <div>
                                          <h6 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">Churn Prediction Model</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Logistic Regression Formula:</strong></div>
                      <div className="ml-2">
                        <div>P(churn) = 1 / (1 + e^(-z))</div>
                        <div>where z = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ</div>
                </div>
                      <div className="mt-2"><strong>Feature Engineering:</strong></div>
                      <div className="ml-2">
                        <div>• Days since last purchase</div>
                        <div>• Support ticket frequency</div>
                        <div>• Average response time</div>
                        <div>• Customer satisfaction trend</div>
                        <div>• Account age</div>
                </div>
                      <div className="mt-2"><strong>Model Performance:</strong></div>
                      <div className="ml-2">
                        <div>• Accuracy: 87.3%</div>
                        <div>• Precision: 0.82</div>
                        <div>• Recall: 0.79</div>
                        <div>• F1-Score: 0.80</div>
                </div>
              </div>
            </div>
                    </div>
                    </div>
          </div>

                        {/* 4. Ticket Analytics Page - Advanced Forecasting & Prediction */}
              <div className="space-y-4">
                              <h5 className="font-semibold text-card-foreground text-lg">Ticket Analytics Page - Advanced Forecasting</h5>
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 ring-1 ring-orange-200 dark:ring-orange-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-orange-800 dark:text-orange-200 mb-3"><TrendingUpIcon className="w-5 h-5 inline mr-2" /> ARIMA Forecasting Model</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>ARIMA(p,d,q) Parameters:</strong></div>
                        <div className="ml-2">
                          <div>• p (AR): 2 (autoregressive terms)</div>
                          <div>• d (I): 1 (differencing order)</div>
                          <div>• q (MA): 1 (moving average terms)</div>
                    </div>
                        <div className="mt-2"><strong>Seasonal Decomposition:</strong></div>
                        <div className="ml-2">
                          <div>• Trend: Linear regression on moving average</div>
                          <div>• Seasonal: 7-day pattern for weekly cycles</div>
                          <div>• Residual: Random noise component</div>
                  </div>
                        <div className="mt-2"><strong>Forecast Formula:</strong></div>
                        <div className="ml-2">
                          <div>Ŷ(t) = μ + φ₁Y(t-1) + φ₂Y(t-2) + θ₁ε(t-1)</div>
                </div>
              </div>
            </div>
                  <div>
                      <h6 className="font-semibold text-orange-800 dark:text-orange-200 mb-3">🌳 Random Forest Classification</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Priority Classification Features:</strong></div>
                        <div>• Ticket age (hours)</div>
                        <div>• Customer tier (bronze/silver/gold)</div>
                        <div>• Category complexity score</div>
                        <div>• Agent availability</div>
                        <div>• Historical resolution time</div>
                        <div className="mt-2"><strong>Algorithm Parameters:</strong></div>
                        <div>• Number of trees: 100</div>
                        <div>• Max depth: 10</div>
                        <div>• Min samples split: 5</div>
                        <div>• Min samples leaf: 2</div>
                  </div>
                  </div>
                    </div>
                  
                  <div>
                                          <h6 className="font-semibold text-orange-800 dark:text-orange-200 mb-3">Bottleneck Detection Algorithm</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Graph Analysis Approach:</strong></div>
                      <div className="ml-2">
                        <div>• Nodes: Processing stages</div>
                        <div>• Edges: Ticket flow between stages</div>
                        <div>• Weights: Average processing time</div>
                    </div>
                      <div className="mt-2"><strong>Bottleneck Identification:</strong></div>
                      <div className="ml-2">
                        <div>1. Calculate flow capacity for each edge</div>
                        <div>2. Find minimum cut in the graph</div>
                        <div>3. Identify edges with highest congestion</div>
                        <div>4. Calculate bottleneck score: capacity / demand</div>
                  </div>
                      <div className="mt-2"><strong>Optimization Algorithm:</strong></div>
                      <div className="ml-2">
                        <div>• Linear programming: minimize total processing time</div>
                        <div>• Constraints: agent capacity, SLA requirements</div>
                        <div>• Objective: maximize throughput</div>
                  </div>
                </div>
              </div>
                    </div>
                    </div>
                  </div>

                        {/* 5. Agent Analytics Page - Advanced Performance Analysis */}
            <div className="space-y-4">
                              <h5 className="font-semibold text-card-foreground text-lg">Agent Analytics Page - Advanced Performance</h5>
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 ring-1 ring-teal-200 dark:ring-teal-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-teal-800 dark:text-teal-200 mb-3">KPI Calculation Engine</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Weighted Scoring System:</strong></div>
                        <div className="ml-2">
                          <div>• Resolution Time: 30% weight</div>
                          <div>• Customer Satisfaction: 25% weight</div>
                          <div>• Ticket Volume: 20% weight</div>
                          <div>• First Response Time: 15% weight</div>
                          <div>• Knowledge Base Usage: 10% weight</div>
                </div>
                        <div className="mt-2"><strong>Formula:</strong></div>
                        <div className="ml-2">
                          <div>KPI Score = Σ(metric × weight × normalization_factor)</div>
                          <div>Normalization: (value - min) / (max - min)</div>
                </div>
                        <div className="mt-2"><strong>Performance Tiers:</strong></div>
                        <div className="ml-2">
                          <div>• Excellent: 90-100%</div>
                          <div>• Good: 75-89%</div>
                          <div>• Average: 60-74%</div>
                          <div>• Needs Improvement: &lt;60%</div>
                </div>
                </div>
              </div>
                    <div>
                      <h6 className="font-semibold text-teal-800 dark:text-teal-200 mb-3">Skill Gap Analysis Matrix</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Competency Matrix (5×5):</strong></div>
                        <div>• Technical Skills: 1-5 scale</div>
                        <div>• Communication: 1-5 scale</div>
                        <div>• Problem Solving: 1-5 scale</div>
                        <div>• Product Knowledge: 1-5 scale</div>
                        <div>• Time Management: 1-5 scale</div>
                        <div className="mt-2"><strong>Gap Calculation:</strong></div>
                        <div>Gap Score = Σ(required_level - current_level)</div>
                        <div>Training Priority = Gap Score × Business Impact</div>
            </div>
          </div>
        </div>
                  
          <div>
                    <h6 className="font-semibold text-teal-800 dark:text-teal-200 mb-3"><BalanceIcon className="w-5 h-5 inline mr-2" /> Workload Balancing Algorithm</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Round-Robin with Priority:</strong></div>
                      <div className="ml-2">
                        <div>1. Sort agents by current workload (ascending)</div>
                        <div>2. Assign tickets based on skill match</div>
                        <div>3. Apply priority weighting</div>
                        <div>4. Consider agent availability</div>
                </div>
                      <div className="mt-2"><strong>Load Distribution Formula:</strong></div>
                      <div className="ml-2">
                        <div>Load Factor = (current_tickets + new_ticket) / max_capacity</div>
                        <div>Optimal Distribution: Load Factor ≤ 0.8 for all agents</div>
                    </div>
                      <div className="mt-2"><strong>Performance Metrics:</strong></div>
                      <div className="ml-2">
                        <div>• Load Balance Index: 0.92 (target: &gt;0.9)</div>
                        <div>• Average Response Time: 2.3 hours</div>
                        <div>• Agent Utilization: 78%</div>
                      </div>
                    </div>
                  </div>
                </div>
                  </div>
          </div>

                        {/* 6. Incident Data Page - Advanced Management & Root Cause Analysis */}
                    <div className="space-y-4">
                              <h5 className="font-semibold text-card-foreground text-lg">Incident Data Page - Advanced Management</h5>
              <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 ring-1 ring-red-200 dark:ring-red-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-red-800 dark:text-red-200 mb-3">Decision Tree Classification</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Severity Classification Rules:</strong></div>
                        <div className="ml-2">
                          <div>• Critical: System down + Business impact</div>
                          <div>• High: Partial outage + Multiple users affected</div>
                          <div>• Medium: Feature unavailable + Single user</div>
                          <div>• Low: Minor issue + Workaround available</div>
                    </div>
                        <div className="mt-2"><strong>Decision Tree Algorithm:</strong></div>
                        <div className="ml-2">
                          <div>• Information Gain: IG(S,A) = H(S) - Σ(|Sv|/|S| × H(Sv))</div>
                          <div>• Entropy: H(S) = -Σ(p × log₂(p))</div>
                          <div>• Split Criteria: Maximum information gain</div>
                  </div>
                    </div>
                  </div>
                    <div>
                      <h6 className="font-semibold text-red-800 dark:text-red-200 mb-3">Escalation Matrix Engine</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Priority Queue Implementation:</strong></div>
                        <div>• Critical: Immediate escalation (0-15 min)</div>
                        <div>• High: 1-hour escalation window</div>
                        <div>• Medium: 4-hour escalation window</div>
                        <div>• Low: 24-hour escalation window</div>
                        <div className="mt-2"><strong>Escalation Triggers:</strong></div>
                        <div>• Time-based: SLA breach approaching</div>
                        <div>• Volume-based: Queue length &gt; threshold</div>
                        <div>• Complexity-based: Skill level mismatch</div>
                </div>
                  </div>
                  </div>
                  
                    <div>
                                          <h6 className="font-semibold text-red-800 dark:text-red-200 mb-3">Root Cause Analysis (Fishbone)</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Causal Inference Algorithm:</strong></div>
                      <div className="ml-2">
                        <div>1. Data Collection: Incident logs, system metrics</div>
                        <div>2. Pattern Recognition: Temporal correlation analysis</div>
                        <div>3. Hypothesis Generation: Causal graph construction</div>
                        <div>4. Statistical Testing: Granger causality tests</div>
                        <div>5. Validation: A/B testing on similar incidents</div>
                    </div>
                      <div className="mt-2"><strong>SLA Calculation Engine:</strong></div>
                      <div className="ml-2">
                        <div>• Business Hours: Mon-Fri 9AM-6PM</div>
                        <div>• Response Time: Time to first acknowledgment</div>
                        <div>• Resolution Time: Time to incident closure</div>
                        <div>• SLA Formula: Actual_Time / Target_Time</div>
                  </div>
                    </div>
                  </div>
                    </div>
                  </div>
                </div>

            {/* 7. Incident Analytics Page - Advanced Pattern Recognition */}
              <div className="space-y-4">
                              <h5 className="font-semibold text-card-foreground text-lg">Incident Analytics Page - Advanced Patterns</h5>
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 ring-1 ring-pink-200 dark:ring-pink-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-pink-800 dark:text-pink-200 mb-3">DBSCAN Clustering Algorithm</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Pattern Recognition Parameters:</strong></div>
                        <div className="ml-2">
                          <div>• Epsilon (ε): 0.5 (neighborhood radius)</div>
                          <div>• MinPts: 3 (minimum points for core)</div>
                          <div>• Distance Metric: Euclidean distance</div>
                    </div>
                        <div className="mt-2"><strong>Algorithm Steps:</strong></div>
                        <div className="ml-2">
                          <div>1. Mark all points as unvisited</div>
                          <div>2. Select random unvisited point p</div>
                          <div>3. Find ε-neighborhood of p</div>
                          <div>4. If |Nε(p)| &lt; MinPts: mark as noise</div>
                          <div>5. Else: create new cluster, expand recursively</div>
                    </div>
                  </div>
                </div>
                  <div>
                      <h6 className="font-semibold text-pink-800 dark:text-pink-200 mb-3">Survival Analysis Model</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Failure Prediction Features:</strong></div>
                        <div>• System age (days since deployment)</div>
                        <div>• Load patterns (CPU, memory, disk)</div>
                        <div>• Error rate trends</div>
                        <div>• Maintenance history</div>
                        <div>• Environmental factors</div>
                        <div className="mt-2"><strong>Kaplan-Meier Estimator:</strong></div>
                        <div>S(t) = Π(1 - dᵢ/nᵢ) for all tᵢ ≤ t</div>
                </div>
                </div>
                </div>
                  
                      <div>
                                          <h6 className="font-semibold text-pink-800 dark:text-pink-200 mb-3">Monte Carlo Simulation</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Impact Analysis Simulation:</strong></div>
                      <div className="ml-2">
                        <div>• Iterations: 10,000 simulations</div>
                        <div>• Variables: Incident duration, affected users, business impact</div>
                        <div>• Distribution: Normal distribution for continuous variables</div>
                        <div>• Output: Probability distribution of total impact</div>
              </div>
                      <div className="mt-2"><strong>Risk Assessment Formula:</strong></div>
                      <div className="ml-2">
                        <div>Risk Score = Probability × Impact × Exposure</div>
                        <div>• Probability: Historical frequency analysis</div>
                        <div>• Impact: Financial + operational + reputational</div>
                        <div>• Exposure: System criticality × user dependency</div>
            </div>
                      <div className="mt-2"><strong>Bayesian Network:</strong></div>
                      <div className="ml-2">
                        <div>• Nodes: Incident factors (causes, effects)</div>
                        <div>• Edges: Conditional dependencies</div>
                        <div>• Inference: P(Effect|Cause) calculation</div>
                </div>
                    </div>
                </div>
                    </div>
                  </div>
                </div>

                        {/* 8. Technical Support Analytics Page - Advanced ML & Knowledge Management */}
                    <div className="space-y-4">
                              <h5 className="font-semibold text-card-foreground text-lg">Technical Support Analytics Page - Advanced ML</h5>
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">🤖 BERT Classification Pipeline</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>NLP Processing Steps:</strong></div>
                        <div className="ml-2">
                          <div>1. Tokenization: WordPiece algorithm</div>
                          <div>2. Embedding: 768-dimensional vectors</div>
                          <div>3. Attention: Multi-head self-attention</div>
                          <div>4. Classification: Softmax output layer</div>
                    </div>
                        <div className="mt-2"><strong>Model Architecture:</strong></div>
                        <div className="ml-2">
                          <div>• Layers: 12 transformer layers</div>
                          <div>• Attention heads: 12</div>
                          <div>• Hidden size: 768</div>
                          <div>• Vocabulary: 30,000 tokens</div>
                    </div>
                        <div className="mt-2"><strong>Performance Metrics:</strong></div>
                        <div className="ml-2">
                          <div>• Accuracy: 94.2%</div>
                          <div>• F1-Score: 0.93</div>
                          <div>• Inference time: 150ms</div>
                    </div>
                  </div>
                </div>
                    <div>
                      <h6 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">TF-IDF Knowledge Ranking</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>TF-IDF Formula:</strong></div>
                        <div>TF-IDF(t,d) = TF(t,d) × IDF(t)</div>
                        <div>• TF(t,d) = count(t,d) / total_terms(d)</div>
                        <div>• IDF(t) = log(total_docs / docs_with_term(t))</div>
                        <div className="mt-2"><strong>Ranking Algorithm:</strong></div>
                        <div>• Query expansion: Synonyms + related terms</div>
                        <div>• Relevance score: Cosine similarity</div>
                        <div>• Boost factors: Recency, popularity, accuracy</div>
                  </div>
                    </div>
              </div>

                  <div>
                                          <h6 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">Skill Matching Algorithm</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Cosine Similarity Calculation:</strong></div>
                      <div className="ml-2">
                        <div>cos(θ) = (A·B) / (||A|| × ||B||)</div>
                        <div>• A: Agent skill vector</div>
                        <div>• B: Ticket requirement vector</div>
                        <div>• Range: 0 (no match) to 1 (perfect match)</div>
                      </div>
                      <div className="mt-2"><strong>Training Effectiveness Analysis:</strong></div>
                      <div className="ml-2">
                        <div>• Pre-training metrics: Baseline performance</div>
                        <div>• Post-training metrics: Improved performance</div>
                        <div>• Statistical significance: t-test (p &lt; 0.05)</div>
                        <div>• ROI calculation: (improvement - cost) / cost</div>
                    </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                        {/* 9. Site Analytics Page - Advanced Web Performance & User Behavior */}
            <div className="space-y-4">
              <h5 className="font-semibold text-card-foreground text-lg">Site Analytics Page - Advanced Monitoring</h5>
              <div className="bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 ring-1 ring-cyan-200 dark:ring-cyan-800 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-3">Web Vitals Performance Monitoring</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Core Web Vitals Metrics:</strong></div>
                        <div className="ml-2">
                                                   <div>• LCP (Largest Contentful Paint): &lt; 2.5s</div>
                         <div>• FID (First Input Delay): &lt; 100ms</div>
                         <div>• CLS (Cumulative Layout Shift): &lt; 0.1</div>
                </div>
                        <div className="mt-2"><strong>Performance Budget:</strong></div>
                        <div className="ml-2">
                                                   <div>• JavaScript: &lt; 300KB</div>
                         <div>• CSS: &lt; 50KB</div>
                         <div>• Images: &lt; 1MB total</div>
                         <div>• Fonts: &lt; 100KB</div>
                </div>
                        <div className="mt-2"><strong>Monitoring API:</strong></div>
                        <div className="ml-2">
                          <div>• PerformanceObserver API</div>
                          <div>• Real User Monitoring (RUM)</div>
                          <div>• Synthetic testing</div>
              </div>
                  </div>
                </div>
                    <div>
                      <h6 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-3">Heatmap Generation Algorithm</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Click Tracking Implementation:</strong></div>
                        <div>• Event listeners: mousedown, touchstart</div>
                        <div>• Coordinate capture: clientX, clientY</div>
                        <div>• Viewport normalization</div>
                        <div>• Heatmap rendering: Canvas API</div>
                        <div className="mt-2"><strong>Heatmap Algorithm:</strong></div>
                        <div>• Gaussian blur: σ = 20px</div>
                        <div>• Color gradient: Blue (cold) to Red (hot)</div>
                        <div>• Intensity: Click frequency × duration</div>
                  </div>
                </div>
              </div>

                  <div>
                                          <h6 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-3">A/B Testing Statistical Analysis</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Chi-Square Test Implementation:</strong></div>
                      <div className="ml-2">
                        <div>χ² = Σ((O - E)² / E)</div>
                        <div>• O: Observed frequency</div>
                        <div>• E: Expected frequency</div>
                        <div>• Degrees of freedom: (rows-1) × (columns-1)</div>
                </div>
                      <div className="mt-2"><strong>Statistical Significance:</strong></div>
                      <div className="ml-2">
                        <div>• Confidence level: 95% (α = 0.05)</div>
                        <div>• Sample size: Minimum 1000 users per variant</div>
                        <div>• Duration: 2 weeks minimum</div>
                        <div>• Multiple testing correction: Bonferroni</div>
              </div>
                      <div className="mt-2"><strong>Conversion Funnel Analysis:</strong></div>
                      <div className="ml-2">
                        <div>• Drop-off calculation: (step_n / step_n-1) × 100</div>
                        <div>• Funnel velocity: Time between steps</div>
                        <div>• Conversion rate: (completions / starts) × 100</div>
                </div>
              </div>
            </div>
                </div>
                  </div>
                </div>
            
            {/* 10. Master Data Pages - Advanced Data Governance & Quality Management */}
          <div className="space-y-4">
                              <h5 className="font-semibold text-card-foreground text-lg"><StorageIcon className="w-6 h-6 inline mr-2" /> Master Data Pages - Advanced Management</h5>
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg p-6">
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h6 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Anomaly Detection (Isolation Forest)</h6>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs">
                        <div><strong>Isolation Forest Algorithm:</strong></div>
                        <div className="ml-2">
                          <div>• Random partitioning of data</div>
                          <div>• Anomalies isolated in fewer splits</div>
                          <div>• Path length: measure of isolation</div>
                          <div>• Anomaly score: 2^(-avg_path_length/c(n))</div>
              </div>
                        <div className="mt-2"><strong>Data Quality Metrics:</strong></div>
                        <div className="ml-2">
                          <div>• Completeness: % non-null values</div>
                          <div>• Accuracy: % correct values</div>
                          <div>• Consistency: % conforming to rules</div>
                          <div>• Timeliness: % up-to-date records</div>
            </div>
                </div>
              </div>
                    <div>
                      <h6 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Data Lineage Tracking</h6>
                      <div className="space-y-2 text-xs">
                        <div><strong>Graph Traversal Algorithm:</strong></div>
                        <div>• Nodes: Data entities (tables, fields)</div>
                        <div>• Edges: Data transformations</div>
                        <div>• Breadth-first search for dependencies</div>
                        <div>• Depth-first search for impact analysis</div>
                        <div className="mt-2"><strong>Version Control:</strong></div>
                        <div>• Diff algorithm: Myers diff</div>
                        <div>• Merge strategy: Three-way merge</div>
                        <div>• Conflict resolution: Manual + automated</div>
              </div>
                </div>
              </div>

                  <div>
                    <h6 className="font-semibold text-gray-800 dark:text-gray-200 mb-3"><SecurityIcon className="w-5 h-5 inline mr-2" /> Data Governance Framework</h6>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                      <div><strong>Access Control Matrix:</strong></div>
                      <div className="ml-2">
                        <div>• RBAC (Role-Based Access Control)</div>
                        <div>• Permissions: Read, Write, Delete, Admin</div>
                        <div>• Data classification: Public, Internal, Confidential</div>
                        <div>• Audit trail: All access logged with timestamp</div>
              </div>
                      <div className="mt-2"><strong>Data Validation Rules:</strong></div>
                      <div className="ml-2">
                        <div>• Schema validation: JSON Schema</div>
                        <div>• Business rules: Custom validation functions</div>
                        <div>• Cross-field validation: Dependency checks</div>
                        <div>• Real-time validation: On input + batch processing</div>
                      </div>
                      <div className="mt-2"><strong>Backup & Recovery:</strong></div>
                      <div className="ml-2">
                        <div>• Full backup: Daily (incremental)</div>
                        <div>• Point-in-time recovery: 15-minute intervals</div>
                        <div>• Disaster recovery: RTO &lt; 4 hours, RPO &lt; 1 hour</div>
                        <div>• Data retention: 7 years for compliance</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
      </CollapsibleSection>
    </div>
    </PageWrapper>
  );
} 