import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CheckCircle, Code, Calculator, Table, List, FileText } from "lucide-react";
import type { ContentBlock, FormulaData, ChangelogEntry, MetricData } from "../../types/documentation";

interface ContentRendererProps {
  content: ContentBlock[];
  searchQuery?: string;
}

export default function ContentRenderer({ content, searchQuery = "" }: ContentRendererProps) {

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'formula':
        return <FormulaRenderer data={block.data as FormulaData} searchQuery={searchQuery} />;
      case 'changelog':
        return <ChangelogRenderer data={block.data as ChangelogEntry} searchQuery={searchQuery} />;
      case 'metric':
        return <MetricRenderer data={block.data as MetricData} searchQuery={searchQuery} />;
      case 'code':
        return <CodeRenderer data={block.data} searchQuery={searchQuery} />;
      case 'table':
        return <TableRenderer data={block.data} searchQuery={searchQuery} />;
      case 'list':
        return <ListRenderer data={block.data} searchQuery={searchQuery} />;
      default:
        return <TextRenderer data={block.data} searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="space-y-6">
      {content.map((block) => (
        <div key={block.id} className="content-block">
          {renderContentBlock(block)}
        </div>
      ))}
    </div>
  );
}

// Formula Renderer
function FormulaRenderer({ data }: { data: FormulaData; searchQuery: string }) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-blue-600" />
          {data.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <h6 className="font-semibold text-sm mb-2">Formula:</h6>
          <code className="text-sm font-mono bg-background px-2 py-1 rounded">
            {data.formula}
          </code>
        </div>
        
        <div>
          <h6 className="font-semibold text-sm mb-2">Data Source:</h6>
          <ul className="space-y-1 text-sm">
            {data.dataSource.map((source, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                {source}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h6 className="font-semibold text-sm mb-2">Example Calculation:</h6>
          <div className="space-y-2 text-sm">
            {Object.entries(data.example.inputs).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key}:</span>
                <span>{value}</span>
              </div>
            ))}
            <div className="border-t pt-2">
              <div className="font-mono text-sm">{data.example.calculation}</div>
              <div className="font-semibold text-green-700 dark:text-green-300">
                Result: {data.example.result}
              </div>
            </div>
          </div>
        </div>
        
        {data.target && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h6 className="font-semibold text-sm mb-1">Target:</h6>
            <Badge variant="info" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {data.target}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Changelog Renderer
function ChangelogRenderer({ data, searchQuery }: { data: ChangelogEntry; searchQuery: string }) {
  const highlightSearchQuery = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'minor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'patch': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'hotfix': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            {data.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getTypeColor(data.type)}>
              {data.type.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">v{data.version}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{data.date}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{data.description}</p>
        
        {data.features.length > 0 && (
          <div>
            <h6 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-300">New Features:</h6>
            <ul className="space-y-1">
              {data.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: highlightSearchQuery(feature) }} />
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {data.improvements.length > 0 && (
          <div>
            <h6 className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-300">Improvements:</h6>
            <ul className="space-y-1">
              {data.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: highlightSearchQuery(improvement) }} />
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {data.fixes.length > 0 && (
          <div>
            <h6 className="font-semibold text-sm mb-2 text-orange-700 dark:text-orange-300">Bug Fixes:</h6>
            <ul className="space-y-1">
              {data.fixes.map((fix, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: highlightSearchQuery(fix) }} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Metric Renderer
function MetricRenderer({ data }: { data: MetricData; searchQuery: string }) {
  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Table className="h-5 w-5 text-purple-600" />
          {data.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <h6 className="font-semibold text-sm mb-2">Formula:</h6>
          <code className="text-sm font-mono bg-background px-2 py-1 rounded">
            {data.formula}
          </code>
        </div>
        
        <div className="flex items-center gap-4">
          <div>
            <h6 className="font-semibold text-sm mb-1">Target:</h6>
            <Badge variant="info">{data.target}</Badge>
          </div>
          <div>
            <h6 className="font-semibold text-sm mb-1">Importance:</h6>
            <Badge 
              variant={data.importance === 'high' ? 'danger' : 
                      data.importance === 'medium' ? 'warning' : 'info'}
            >
              {data.importance.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Code Renderer
function CodeRenderer({ data, searchQuery }: { data: any; searchQuery: string }) {
  const highlightSearchQuery = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Code className="h-4 w-4" />
        <span className="text-sm font-medium">Code</span>
      </div>
      <pre className="text-sm font-mono overflow-x-auto">
        <code dangerouslySetInnerHTML={{ __html: highlightSearchQuery(data) }} />
      </pre>
    </div>
  );
}

// Table Renderer
function TableRenderer({ data, searchQuery }: { data: any; searchQuery: string }) {
  const highlightSearchQuery = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border">
        <thead>
          <tr className="bg-muted/50">
            {data.headers?.map((header: string, index: number) => (
              <th key={index} className="border border-border px-3 py-2 text-left text-sm font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows?.map((row: any[], rowIndex: number) => (
            <tr key={rowIndex}>
              {row.map((cell: any, cellIndex: number) => (
                <td key={cellIndex} className="border border-border px-3 py-2 text-sm">
                  <span dangerouslySetInnerHTML={{ __html: highlightSearchQuery(String(cell)) }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// List Renderer
function ListRenderer({ data, searchQuery }: { data: any; searchQuery: string }) {
  const highlightSearchQuery = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };
  return (
    <ul className="space-y-2">
      {data.items?.map((item: string, index: number) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          <List className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: highlightSearchQuery(item) }} />
        </li>
      ))}
    </ul>
  );
}

// Text Renderer
function TextRenderer({ data, searchQuery }: { data: any; searchQuery: string }) {
  const highlightSearchQuery = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };
  return (
    <div className="prose prose-sm max-w-none">
      <p dangerouslySetInnerHTML={{ __html: highlightSearchQuery(data) }} />
    </div>
  );
}
