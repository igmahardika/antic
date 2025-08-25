import React, { useState, useEffect } from 'react';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import GroupIcon from '@mui/icons-material/Group';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/store/agentStore';
import { useAgentAnalytics } from './AgentAnalyticsContext';
import jsPDF from 'jspdf';
import SummaryCard from './ui/SummaryCard';
import TimeFilter from './TimeFilter';
import { ListAlt as ListAltIcon, TrendingUp as TrendingUpIcon, Download as DownloadIcon } from '@mui/icons-material';
import PageWrapper from './PageWrapper';
import type { AgentMetric } from '@/utils/agentKpi';
import { enableBacklogDebug } from '@/utils/agentKpi';
import { formatDurationDHM } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import TimelineIcon from '@mui/icons-material/Timeline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend as RechartsLegend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import * as RadixDialog from '@radix-ui/react-dialog';

// Define the structure of the data this component will receive
export interface AgentAnalyticsData {
  agentName: string;
  ticketCount: number;
  totalDurationFormatted: string;
  avgDurationFormatted: string;
  minDurationFormatted: string;
  maxDurationFormatted: string;
}

// Unused function - commented out
// const getTrendPercentage = (dataArr) => {
//   if (!dataArr || dataArr.length < 2) return null;
//   const prev = dataArr[dataArr.length - 2];
//   const curr = dataArr[dataArr.length - 1];
//   if (prev === 0) return null;
//   const percent = ((curr - prev) / Math.abs(prev)) * 100;
//   return percent;
// };

// Unused array - commented out
// const AGENT_COLORS = [
//   'text-blue-500', 'text-green-500', 'text-orange-500', 'text-purple-500', 'text-red-500',
//   'text-pink-500', 'text-teal-500', 'text-yellow-500', 'text-indigo-500', 'text-emerald-500'
// ];
const TREND_COLORS = [
  '#6366F1', '#22C55E', '#F59E42', '#8B5CF6', '#EF4444', '#F472B6', '#14B8A6', '#EAB308', '#0EA5E9', '#10B981'
];

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Helper to convert agent trend data to recharts format
function toRechartsAgentTrend(labels: string[], datasets: { label: string, data: number[], color?: string }[]) {
  // Each dataset is an agent, each label is a month
  return labels.map((label, i) => {
    const entry: any = { label };
    datasets.forEach(ds => {
      entry[ds.label] = ds.data[i];
    });
    return entry;
  });
}

// Custom Tooltip for AreaChart
const CustomTooltip = ({ active = false, payload = [], label = '' } = {}) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 p-4 max-h-52 overflow-y-auto min-w-[180px] text-xs" style={{ fontSize: '12px', lineHeight: '1.5' }}>
      <div className="font-bold text-sm mb-2 text-gray-900 dark:text-gray-100">{label}</div>
      <ul className="space-y-1">
        {payload.map((entry, idx) => (
          <li key={idx} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: entry.color }}></span>
            <span className="font-semibold" style={{ color: entry.color }}>{entry.name}:</span>
            <span className="ml-1 font-mono text-gray-800 dark:text-gray-200">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Unused component - commented out
// const CustomMiniTooltip = ({ active, payload, label }: any) => {
//   if (!active || !payload || !payload.length) return null;
//   // Selalu render hanya satu value (payload[0]) untuk mini chart single series
//   let value = payload[0].value;
//   const lowerLabel = (label || '').toLowerCase();
//   let displayLabel = label;
//   if (lowerLabel.includes('frt')) {
//     value = typeof value === 'number' ? formatDurationDHM(value) : value;
//     displayLabel = 'FRT';
//   } else if (lowerLabel.includes('art')) {
//     value = typeof value === 'number' ? formatDurationDHM(value) : value;
//     displayLabel = 'ART';
//   } else if (lowerLabel.includes('fcr')) {
//     value = typeof value === 'number' ? value.toFixed(1) + '%' : value;
//     displayLabel = 'FCR';
//   } else if (lowerLabel.includes('sla')) {
//     value = typeof value === 'number' ? value.toFixed(1) + '%' : value;
//     displayLabel = 'SLA';
//   }
//   return (
//     <div className="bg-white dark:bg-zinc-900 rounded shadow px-3 py-2 text-xs">
//       <div className="font-bold mb-1">{label}</div>
//       <div><span className="font-semibold mr-2">{displayLabel}:</span><span className="font-mono">{value}</span></div>
//     </div>
//   );
// };

// Unused component - commented out
// function ScoreCircle({ score }: { score: number }) {
//   const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-400' : 'bg-red-500';
//   const icon = score >= 80 ? <EmojiEventsIcon className="text-white w-7 h-7 mb-1" /> : score >= 60 ? <StarIcon className="text-white w-7 h-7 mb-1" /> : <EmojiEventsIcon className="text-white w-7 h-7 mb-1" />;
//   return (
//     <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-full shadow-lg ${color}`}>
//       {icon}
//       <span className="text-2xl font-extrabold text-white leading-none">{score}</span>
//       <span className="text-xs font-semibold text-white/80">Score</span>
//     </div>
//   );
// }



const AgentAnalytics = () => {
  // Semua hook di bagian paling atas
  const {
    agentAnalyticsData = {},
    startMonth, setStartMonth,
    endMonth, setEndMonth,
    selectedYear, setSelectedYear,
    allYearsInData,
    allTickets,
    agentMonthlyChart
  } = useAgentAnalytics() || {};
  
  // Note: cutoffStart and cutoffEnd are not used in career report tabs
  // They are only used for time filtering in the main agent list
  const data = agentAnalyticsData || {};
  const agentMetrics = useAgentStore((state) => state.agentMetrics) as AgentMetric[];
  
  // Use agentMetrics as data source (excelAgentData functionality removed)
  const dataSource = agentMetrics;
  // Unused state - commented out
  // const [excelAgentData, setExcelAgentData] = useState<any[]>([]);
  const [debouncedTrendData, setDebouncedTrendData] = useState<any[]>([]);
  const [debouncedDatasets, setDebouncedDatasets] = useState<{ label: string; data: number[]; color?: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [backlogDebugEnabled, setBacklogDebugEnabled] = useState(false);
  const [exportYear, setExportYear] = useState('all');

  useEffect(() => {
    console.log('Agent Metrics DEBUG:', agentMetrics);
  }, [agentMetrics]);

  // Debug: log agent names to check for inconsistencies
  useEffect(() => {
    if (dataSource && dataSource.length > 0) {
      console.log('Agent names in dataSource:', dataSource.map(a => a.agent));
    }
  }, [dataSource]);

  // Function to toggle backlog debugging
  const toggleBacklogDebug = () => {
    const newState = !backlogDebugEnabled;
    setBacklogDebugEnabled(newState);
    enableBacklogDebug(newState);
  };

  // Function to export agent career report to PDF
  const exportToPDF = async () => {
    if (!selectedAgent) return;
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      
      let yPosition = margin;
      
      // Helper functions for professional report design
      const addHeader = (title: string, subtitle: string) => {
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;
      };
      
      const addSectionTitle = (title: string) => {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(title, margin, yPosition);
        yPosition += 8;
        
        // Add underline
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(1);
        pdf.line(margin, yPosition, margin + 40, yPosition);
        yPosition += 8;
      };
      
      const addSubsectionTitle = (title: string) => {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 65, 81);
        pdf.text(title, margin, yPosition);
        yPosition += 6;
      };
      

      
      const addInsightBox = (title: string, description: string, impact: string, y: number) => {
        const boxWidth = pageWidth - (margin * 2);
        const boxHeight = 25;
        
        // Draw box
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');
        
        // Title
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(title, margin + 5, y + 6);
        
        // Impact badge
        const impactColor = impact === 'HIGH' ? [239, 68, 68] : impact === 'MEDIUM' ? [245, 158, 11] : [34, 197, 94];
        pdf.setTextColor(impactColor[0], impactColor[1], impactColor[2]);
        pdf.text(`[${impact}]`, margin + 5, y + 16);
        
        // Description
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        const descLines = pdf.splitTextToSize(description, boxWidth - 10);
        pdf.text(descLines, margin + 5, y + 22);
      };
      
      const addParagraph = (text: string) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        const lines = pdf.splitTextToSize(text, pageWidth - (margin * 2));
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * 5 + 3;
      };
      

      
      // ===== PROFESSIONAL REPORT HEADER =====
      addHeader('Agent Career Report', `Performance Analysis for ${selectedAgent}`);
      
      // Report metadata
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Report Period: ${exportYear === 'all' ? 'All Time Career Data' : exportYear}`, margin, yPosition);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })}`, pageWidth - margin - 60, yPosition);
      yPosition += 8;
      
      // Executive Summary
      addParagraph(`This report provides a comprehensive analysis of ${selectedAgent}'s performance throughout their career. The analysis covers key performance indicators, efficiency metrics, quality standards, and actionable insights for continuous improvement.`);
      
      yPosition += 5;
      
      // ===== GET AGENT DATA =====
      const agentTickets = allTickets?.filter(t => t.openBy === selectedAgent) || [];
      let filteredTickets = agentTickets;
      
      if (exportYear !== 'all') {
        filteredTickets = agentTickets.filter(t => {
          if (!t.openTime) return false;
          const ticketYear = new Date(t.openTime).getFullYear().toString();
          return ticketYear === exportYear;
        });
      }
      
      // Calculate all metrics
      const totalTickets = filteredTickets.length;
      
      // Tenure calculation
      const validTickets = filteredTickets.filter(t => {
        if (!t.openTime) return false;
        const date = new Date(t.openTime);
        return !isNaN(date.getTime());
      });
      
      const firstTicket = validTickets.length > 0 ? 
        validTickets.reduce((earliest, t) => {
          const currentDate = new Date(t.openTime);
          const earliestDate = new Date(earliest.openTime);
          return currentDate < earliestDate ? t : earliest;
        }) : null;
        
      const lastTicket = validTickets.length > 0 ? 
        validTickets.reduce((latest, t) => {
          const currentDate = new Date(t.openTime);
          const latestDate = new Date(latest.openTime);
          return currentDate > latestDate ? t : latest;
        }) : null;
      
      let tenure = 0;
      if (firstTicket && lastTicket) {
        const firstDate = new Date(firstTicket.openTime);
        const lastDate = new Date(lastTicket.openTime);
        if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
          tenure = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      
      // AHT calculation
      const ahtValues = filteredTickets
        .filter(t => {
          if (!t.openTime || !t.closeTime) return false;
          const openDate = new Date(t.openTime);
          const closeDate = new Date(t.closeTime);
          return !isNaN(openDate.getTime()) && !isNaN(closeDate.getTime()) && closeDate > openDate;
        })
        .map(t => {
          const open = new Date(t.openTime);
          const close = new Date(t.closeTime);
          return (close.getTime() - open.getTime()) / 60000;
        })
        .filter(t => t > 0 && t < 10080);
      
      const avgAHT = ahtValues.length > 0 ? 
        ahtValues.reduce((sum, val) => sum + val, 0) / ahtValues.length : 0;
      
      // FCR calculation
      const fcrTickets = filteredTickets.filter(t => {
        return !t.handling2 || t.handling2.trim() === '';
      });
      const fcrRate = totalTickets > 0 ? (fcrTickets.length / totalTickets) * 100 : 0;
      
      // SLA calculation
      const slaCompliant = filteredTickets.filter(t => {
        if (!t.openTime || !t.closeTime) return false;
        const openDate = new Date(t.openTime);
        const closeDate = new Date(t.closeTime);
        if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return false;
        if (closeDate <= openDate) return false;
        
        const diffMin = (closeDate.getTime() - openDate.getTime()) / 60000;
        return diffMin <= 1440 && diffMin > 0;
      }).length;
      const slaRate = totalTickets > 0 ? (slaCompliant / totalTickets) * 100 : 0;
      
      // Escalation calculation
      const escalated = filteredTickets.filter(t => {
        const handlingFields = [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5];
        return handlingFields.some(h => h && h.trim() !== '');
      }).length;
      const escalationRate = totalTickets > 0 ? (escalated / totalTickets) * 100 : 0;
      
      // Shift breakdown
      const shiftCount = { Pagi: 0, Siang: 0, Malam: 0 };
      filteredTickets.forEach(t => {
        if (!t.openTime) return;
        const hour = new Date(t.openTime).getHours();
        if (hour >= 6 && hour < 14) shiftCount.Pagi++;
        else if (hour >= 14 && hour < 22) shiftCount.Siang++;
        else shiftCount.Malam++;
      });
      
      // Calculate CPI
      const efficiencyScore = Math.max(0, 100 - (avgAHT / 60) * 10);
      const qualityScore = slaRate;
      const resolutionScore = fcrRate - escalationRate;
      const reliabilityScore = Math.max(0, 100 - escalationRate * 5);
      const productivityScore = Math.min(100, (totalTickets / 100) * 100);
      
      const cpi = Math.round(
        efficiencyScore * 0.25 +
        qualityScore * 0.30 +
        resolutionScore * 0.20 +
        reliabilityScore * 0.15 +
        productivityScore * 0.10
      );
      
      const getCPILevel = (score: number) => {
        if (score >= 90) return { level: 'Platinum', color: [147, 51, 234] };
        if (score >= 70) return { level: 'Gold', color: [245, 158, 11] };
        if (score >= 40) return { level: 'Silver', color: [107, 114, 128] };
        return { level: 'Bronze', color: [249, 115, 22] };
      };
      
      const cpiLevel = getCPILevel(cpi);
      
      // ===== KEY PERFORMANCE INDICATORS =====
      addSectionTitle('Key Performance Indicators');
      
      // KPI Table Layout with better spacing
      const col1 = margin;
      const col2 = margin + 90;
      const col3 = margin + 170;
      const col4 = margin + 250;
      
      // Header row with better formatting
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      pdf.text('Metric', col1, yPosition);
      pdf.text('Value', col2, yPosition);
      pdf.text('Target', col3, yPosition);
      pdf.text('Status', col4, yPosition);
      yPosition += 6;
      
      // Separator line
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      // Data rows with improved formatting
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const kpiData = [
        { 
          metric: 'Total Tickets Handled', 
          value: totalTickets.toLocaleString(), 
          target: 'N/A', 
          status: 'Active',
          statusColor: [107, 114, 128]
        },
        { 
          metric: 'Career Tenure', 
          value: `${tenure} days`, 
          target: 'N/A', 
          status: 'Ongoing',
          statusColor: [107, 114, 128]
        },
        { 
          metric: 'Average Handle Time', 
          value: `${Math.floor(avgAHT/60)}h ${Math.floor(avgAHT%60)}m`, 
          target: '≤24h', 
          status: avgAHT <= 1440 ? 'On Target' : 'Above Target',
          statusColor: avgAHT <= 1440 ? [34, 197, 94] : [245, 158, 11]
        },
        { 
          metric: 'SLA Compliance Rate', 
          value: `${slaRate.toFixed(1)}%`, 
          target: '≥85%', 
          status: slaRate >= 85 ? 'Exceeding' : 'Below Target',
          statusColor: slaRate >= 85 ? [34, 197, 94] : [245, 158, 11]
        },
        { 
          metric: 'FCR Rate', 
          value: `${fcrRate.toFixed(1)}%`, 
          target: '≥75%', 
          status: fcrRate >= 75 ? 'Exceeding' : 'Below Target',
          statusColor: fcrRate >= 75 ? [34, 197, 94] : [245, 158, 11]
        },
        { 
          metric: 'Escalation Rate', 
          value: `${escalationRate.toFixed(1)}%`, 
          target: '≤10%', 
          status: escalationRate <= 10 ? 'On Target' : 'Above Target',
          statusColor: escalationRate <= 10 ? [34, 197, 94] : [245, 158, 11]
        }
      ];
      
      kpiData.forEach(row => {
        // Metric name
        pdf.setTextColor(17, 24, 39);
        pdf.text(row.metric, col1, yPosition);
        
        // Value
        pdf.setFont('helvetica', 'bold');
        pdf.text(row.value, col2, yPosition);
        
        // Target
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(row.target, col3, yPosition);
        
        // Status with color
        pdf.setTextColor(row.statusColor[0], row.statusColor[1], row.statusColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(row.status, col4, yPosition);
        
        yPosition += 6;
      });
      
      yPosition += 8;
      
      // Shift Distribution with better formatting
      yPosition += 3;
      addSubsectionTitle('Shift Distribution');
      
      const shiftData = [
        { shift: 'Pagi', count: shiftCount.Pagi, percentage: ((shiftCount.Pagi/totalTickets)*100).toFixed(1) },
        { shift: 'Siang', count: shiftCount.Siang, percentage: ((shiftCount.Siang/totalTickets)*100).toFixed(1) },
        { shift: 'Malam', count: shiftCount.Malam, percentage: ((shiftCount.Malam/totalTickets)*100).toFixed(1) }
      ];
      
      shiftData.forEach((item, index) => {
        const xPos = margin + (index * 80);
        
        // Shift name
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(item.shift, xPos, yPosition);
        
        // Count and percentage
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(`${item.count} tickets (${item.percentage}%)`, xPos, yPosition + 5);
      });
      
      yPosition += 12;
      
      // ===== CAREER PERFORMANCE INDEX =====
      addSectionTitle('Career Performance Index');
      
      // CPI Score and Level with better formatting
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(cpiLevel.color[0], cpiLevel.color[1], cpiLevel.color[2]);
      pdf.text(`Overall Score: ${cpi} (${cpiLevel.level})`, margin, yPosition);
      yPosition += 10;
      
      // CPI Components Table with better layout
      addSubsectionTitle('Performance Components');
      
      const componentData = [
        { component: 'Efficiency', score: efficiencyScore, weight: '25%', color: [59, 130, 246] },
        { component: 'Quality', score: qualityScore, weight: '30%', color: [34, 197, 94] },
        { component: 'Resolution', score: resolutionScore, weight: '20%', color: [168, 85, 247] },
        { component: 'Reliability', score: reliabilityScore, weight: '15%', color: [249, 115, 22] },
        { component: 'Productivity', score: productivityScore, weight: '10%', color: [236, 72, 153] }
      ];
      
      componentData.forEach(comp => {
        // Component name
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(comp.component, margin, yPosition);
        
        // Score with color
        pdf.setTextColor(comp.color[0], comp.color[1], comp.color[2]);
        pdf.text(`${comp.score.toFixed(0)}`, margin + 80, yPosition);
        
        // Weight
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(`(${comp.weight})`, margin + 120, yPosition);
        
        yPosition += 5;
      });
      
      yPosition += 8;
      
      // Performance Summary with better language
      const performanceText = `The agent demonstrates ${cpiLevel.level.toLowerCase()} level performance with a balanced approach across all key areas. The ${cpi >= 70 ? 'strong' : 'solid'} foundation in quality and efficiency metrics indicates ${cpi >= 70 ? 'excellent potential for advancement' : 'good potential for development'}.`;
      addParagraph(performanceText);
      
      yPosition += 5;
      
      // ===== AUTO INSIGHTS =====
      addSectionTitle('Key Insights & Recommendations');
      
      const insights = [];
      
      // Generate comprehensive insights
      if (avgAHT > 1440) {
        insights.push({
          title: 'AHT Above Target',
          description: `Average Handle Time (${Math.floor(avgAHT/60)}h ${Math.floor(avgAHT%60)}m) exceeds 24-hour target. Consider process optimization and training.`,
          impact: 'HIGH'
        });
      } else if (avgAHT < 720) {
        insights.push({
          title: 'Excellent AHT Performance',
          description: `Average Handle Time (${Math.floor(avgAHT/60)}h ${Math.floor(avgAHT%60)}m) is well below target. Share best practices with team.`,
          impact: 'POSITIVE'
        });
      }
      
      if (slaRate < 85) {
        insights.push({
          title: 'SLA Below Target',
          description: `SLA compliance rate (${slaRate.toFixed(1)}%) is below 85% target. Focus on faster resolution and prioritize urgent cases.`,
          impact: 'HIGH'
        });
      } else if (slaRate > 95) {
        insights.push({
          title: 'Outstanding SLA Performance',
          description: `SLA compliance rate (${slaRate.toFixed(1)}%) exceeds 95%. Maintain current standards and share best practices.`,
          impact: 'POSITIVE'
        });
      }
      
      if (fcrRate < 75) {
        insights.push({
          title: 'FCR Below Target',
          description: `First Contact Resolution rate (${fcrRate.toFixed(1)}%) is below 75% target. Review knowledge base and improve resolution skills.`,
          impact: 'HIGH'
        });
      } else if (fcrRate > 85) {
        insights.push({
          title: 'Excellent FCR Performance',
          description: `First Contact Resolution rate (${fcrRate.toFixed(1)}%) exceeds 85%. Consider mentoring opportunities for newer agents.`,
          impact: 'POSITIVE'
        });
      }
      
      if (escalationRate > 10) {
        insights.push({
          title: 'High Escalation Rate',
          description: `Escalation rate (${escalationRate.toFixed(1)}%) is above 10% threshold. Identify common reasons and provide additional training.`,
          impact: 'MEDIUM'
        });
      } else if (escalationRate < 5) {
        insights.push({
          title: 'Low Escalation Rate',
          description: `Escalation rate (${escalationRate.toFixed(1)}%) is below 5%. Excellent problem-solving skills demonstrated.`,
          impact: 'POSITIVE'
        });
      }
      
      if (totalTickets > 500) {
        insights.push({
          title: 'High Volume Handler',
          description: `Handled ${totalTickets.toLocaleString()} tickets - excellent productivity. Consider mentoring opportunities and share workload strategies.`,
          impact: 'POSITIVE'
        });
      }
      
      // Always show at least one insight or summary
      if (insights.length > 0) {
        insights.forEach((insight) => {
          addInsightBox(insight.title, insight.description, insight.impact, yPosition);
          yPosition += 30;
        });
      } else {
        // Show positive summary when all metrics are good
        addInsightBox(
          'Consistent Performance', 
          'All key performance indicators are within target ranges. Continue maintaining current standards and consider advancement opportunities.',
          'POSITIVE',
          yPosition
        );
        yPosition += 30;
      }
      
      yPosition += 8;
      
      // Executive Summary
      addSectionTitle('Executive Summary');
      
      const summaryText = [
        `${selectedAgent} demonstrates ${cpiLevel.level.toLowerCase()} level performance with a Career Performance Index of ${cpi}.`,
        `Over ${tenure} days of active service, the agent has handled ${totalTickets} tickets with an average handle time of ${Math.floor(avgAHT/60)}h ${Math.floor(avgAHT%60)}m.`,
        `Key strengths include ${slaRate >= 85 ? 'excellent SLA compliance' : 'consistent ticket handling'}, while areas for improvement include ${fcrRate < 75 ? 'first contact resolution' : 'overall efficiency'}.`,
        `The agent shows ${cpi >= 70 ? 'strong potential for advancement' : 'good foundation for development'} and would benefit from ${cpi >= 70 ? 'mentoring opportunities' : 'targeted training programs'}.`
      ];
      
      summaryText.forEach(text => {
        addParagraph(text);
      });
      
      // Footer
      yPosition = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Generated by Helpdesk Management System', pageWidth / 2, yPosition, { align: 'center' });
      
      // Save the PDF
      const fileName = `Agent_Career_Report_${selectedAgent}_${exportYear === 'all' ? 'AllTime' : exportYear}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Ganti monthOptions agar selalu 12 bulan
  const monthOptions = MONTH_OPTIONS;

  // Unused variable - commented out
  // const summaryKpi = useMemo(() => {
  //   if (!agentMetrics || agentMetrics.length === 0) return null;
  //   const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  //   return {
  //     avgFRT: avg(agentMetrics.map(m => m.frt)),
  //     avgART: avg(agentMetrics.map(m => m.art)),
  //     avgFCR: avg(agentMetrics.map(m => m.fcr)),
  //     avgSLA: avg(agentMetrics.map(m => m.sla)),
  //     avgVol: avg(agentMetrics.map(m => m.vol)),
  //     avgBacklog: avg(agentMetrics.map(m => m.backlog)),
  //   };
  // }, [agentMetrics]);

  // Unused variable - commented out
  // const rechartsAgentTrendData = useMemo(() => {
  //   if (!data || !data.agentMonthlyChart || !Array.isArray(data.agentMonthlyChart.datasets)) return [];
  //   return toRechartsAgentTrend(data.agentMonthlyChart.labels, data.agentMonthlyChart.datasets);
  // }, [data]);
  const agentTrendDatasets: { label: string; data: number[]; color?: string }[] = data?.agentMonthlyChart?.datasets || [];
  const agentTrendLabels: string[] = data?.agentMonthlyChart?.labels || [];

  // Debounce & windowing for trend data
  useEffect(() => {
    const timer = setTimeout(() => {
      // Windowing: hanya render 24 data terakhir (misal: 2 tahun jika bulanan)
      const windowedLabels = agentTrendLabels.slice(-24);
      const windowedDatasets = agentTrendDatasets.map(ds => ({
        ...ds,
        data: ds.data.slice(-24)
      }));
      setDebouncedTrendData(toRechartsAgentTrend(windowedLabels, windowedDatasets));
      setDebouncedDatasets(windowedDatasets);
    }, 300);
    return () => clearTimeout(timer);
  }, [agentTrendLabels, agentTrendDatasets]);

  // Filtering logic for all years
  let filteredAgentList = [];
  if (data && Array.isArray(data.agentList)) {
    if (selectedYear === 'ALL') {
      filteredAgentList = data.agentList;
    } else {
      filteredAgentList = data.agentList; // You can add more granular filtering if needed
    }
  }

  const isDataReady = data && data.summary && filteredAgentList.length > 0;
  if (!isDataReady) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Agent Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Analisis performa dan aktivitas agent dalam menangani tiket pada periode terpilih.</p>
          <MenuBookIcon className="w-16 h-16 mb-4" />
          <h3 className="text-xl md:text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">No agent data available</h3>
        <p>Please upload a file to see agent analytics.</p>
        </div>
    );
  }
  const { summary = {} } = data;
  // Unused variable - commented out
  // const sortedAgentList = [...filteredAgentList].sort((a, b) => (b.ticketCount || 0) - (a.ticketCount || 0));

  // --- Normalisasi & Scoring KPI sesuai formula baru ---
  function normalizePositive(actual: number, target: number) {
    return Math.min((actual / target) * 100, 120);
  }
  function normalizeNegative(actual: number, target: number) {
    if (!actual) return 0;
    return Math.min((target / actual) * 100, 120);
  }
  function scoreBacklog(backlog: number) {
    if (backlog === 0) return 100;
    if (backlog <= 10) return Math.max(100 - backlog * 5, 0);
    return 0;
  }
  function scoreTicket(ticket: number, maxTicket: number) {
    if (!maxTicket) return 100;
    return Math.min((ticket / maxTicket) * 100, 120);
  }
  function calculateAgentScore(agent: any, maxTicket: number) {
    const fcrScore = normalizePositive(agent.fcr, 75) * 0.3;
    const slaScore = normalizePositive(agent.sla, 85) * 0.25;
    // Update FRT target to 60 minutes (1 hour)
    const frtScore = normalizeNegative(agent.frtMinutes, 60) * 0.15;
    // Update ART target to 1440 minutes (24 hours)
    const artScore = normalizeNegative(agent.artMinutes, 1440) * 0.15;
    const backlogScore = scoreBacklog(agent.backlog) * 0.05;
    const ticketScore = scoreTicket(agent.ticket, maxTicket) * 0.10;
    return fcrScore + slaScore + frtScore + artScore + backlogScore + ticketScore;
  }

  // Perhitungan AQS dan insight otomatis (score global agent)
  const maxTicket = Math.max(...dataSource.map(m => m.vol || 0), 1);
  const agentWithScore = dataSource.map(m => {
    const agentObj = {
      fcr: m.fcr || 0,
      sla: m.sla || 0,
      frtMinutes: m.frt || 0,
      artMinutes: m.art || 0,
      backlog: m.backlog || 0,
      ticket: m.vol || 0,
    };
    const score = Math.round(calculateAgentScore(agentObj, maxTicket));
    // Insight otomatis (bisa disesuaikan)
    let insight = '';
    if (agentObj.frtMinutes > 15) insight = 'Avg FRT di atas target.';
    if (agentObj.sla < 85) insight = 'SLA di bawah target.';
    return { ...m, score, insight };
  });
  // Urutkan agent berdasarkan score dari tertinggi ke terendah
  const sortedAgentWithScore = [...agentWithScore]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((a, i) => ({ ...a, rankNum: i + 1 }));

  // Helper: ambil tren score agent per bulan (score bulanan, bukan volume)
  function getAgentScoreTrend(agentName: string) {
    if (!data.agentMonthlyChart || !data.agentMonthlyChart.labels) return [];
    const idx = data.agentMonthlyChart.datasets.findIndex(ds => ds.label === agentName);
    if (idx === -1) return [];
    // Ambil data bulanan agent
    const volArr = data.agentMonthlyChart.datasets[idx]?.data || [];
    const frtArr = data.agentMonthlyChart.datasetsFRT?.find(ds => ds.label === agentName)?.data || [];
    const artArr = data.agentMonthlyChart.datasetsART?.find(ds => ds.label === agentName)?.data || [];
    const fcrArr = data.agentMonthlyChart.datasetsFCR?.find(ds => ds.label === agentName)?.data || [];
    const slaArr = data.agentMonthlyChart.datasetsSLA?.find(ds => ds.label === agentName)?.data || [];
    const backlogArr = data.agentMonthlyChart.datasetsBacklog?.find(ds => ds.label === agentName)?.data || [];
    // Cari max ticket untuk normalisasi
    const maxTicket = Math.max(...volArr, 1);
    // Hitung score bulanan dengan rumus baru
    return data.agentMonthlyChart.labels.map((_, i) => {
      const agentMonth = {
        fcr: fcrArr[i] || 0,
        sla: slaArr[i] || 0,
        frtMinutes: frtArr[i] || 0,
        artMinutes: artArr[i] || 0,
        backlog: backlogArr[i] || 0,
        ticket: volArr[i] || 0,
      };
      return Math.round(calculateAgentScore(agentMonth, maxTicket));
    });
  }

  // Helper: trend direction
  function getTrendDirection(values: number[]): 'up' | 'down' | 'flat' {
    if (!values || values.length < 2) return 'flat';
    const delta = values[values.length - 1] - values[values.length - 2];
    if (Math.abs(delta) < 1e-2) return 'flat';
    return delta > 0 ? 'up' : 'down';
  }

  // Helper: normalize agent name for photo lookup
  function getAgentPhotoPath(agentName: string): string {
    // Special handling for Difa' Fathir Aditya
    if (agentName.includes('Difa')) {
      // Try the exact filename first (with apostrophe)
      return `/agent-photos/Difa' Fathir Aditya.png`;
    }
    
    // For other agents, use the original name
    return `/agent-photos/${agentName}.png`;
  }


  // Helper: insight text per KPI
  function generateKpiInsight(kpi: string, trend: 'up' | 'down' | 'flat') {
    const messages: Record<string, Record<string, string>> = {
      ticket: {
        up: 'Volume meningkat. Siapkan tambahan agent.',
        down: 'Volume menurun. Workload menurun.',
        flat: 'Volume stabil. Workload konsisten.'
      },
      frt: {
        up: 'Respon awal melambat. Review SOP respon.',
        down: 'Respon awal membaik. Pertahankan performa.',
        flat: 'Respons awal stabil.'
      },
      art: {
        up: 'Durasi penyelesaian meningkat. Efisiensi perlu ditinjau.',
        down: 'Efisiensi membaik. Pertahankan.',
        flat: 'Efisiensi stabil.'
      },
      fcr: {
        up: 'Penyelesaian sekali kontak meningkat. Sangat baik!',
        down: 'Banyak case perlu tindak lanjut. Tingkatkan kualitas solusi.',
        flat: 'FCR stabil.'
      },
      sla: {
        up: 'Ketepatan layanan membaik. Good.',
        down: 'Delay meningkat. Perlu antisipasi jam sibuk.',
        flat: 'SLA stabil.'
      },
      backlog: {
        up: 'Backlog meningkat. Potensi beban berlebih.',
        down: 'Backlog turun. Kinerja penyelesaian baik.',
        flat: 'Backlog stabil.'
      }
    };
    return messages[kpi][trend];
  }

  // --- Refactor summaryCards sesuai struktur rekomendasi ---
  const topOverall = agentWithScore.reduce((a, b) => (b.score > a.score ? b : a), agentWithScore[0]);
  const fastestResponder = agentWithScore.reduce((a, b) => (b.frt < a.frt ? b : a), agentWithScore[0]);
  const fastestResolution = agentWithScore.reduce((a, b) => (b.art < a.art ? b : a), agentWithScore[0]);
  const bestSLA = agentWithScore.reduce((a, b) => (b.sla > a.sla ? b : a), agentWithScore[0]);
  const mostReliable = agentWithScore.filter(a => a.backlog === 0).reduce((a, b) => (b.fcr > a.fcr ? b : a), agentWithScore[0]);
  const mostEngaged = agentWithScore.reduce((a, b) => (b.vol > a.vol ? b : a), agentWithScore[0]);
  const agentWithDelta = agentWithScore.map(a => {
    const trend = getAgentScoreTrend(a.agent);
    const delta = trend.length > 1 ? trend[trend.length-1] - trend[trend.length-2] : 0;
    return { ...a, delta };
  });
  const mostImproved = agentWithDelta.reduce((a, b) => (b.delta > a.delta ? b : a), agentWithDelta[0]);
  const summaryCards = [
    {
      title: 'Total Active Agents',
      value: summary.totalAgents,
      icon: GroupIcon,
      description: 'Number of active agents',
    },
    {
      title: 'Top Overall Agent',
      value: topOverall?.agent,
      icon: EmojiEventsIcon,
      description: `Highest overall score (${topOverall?.score ?? '-'})`,
    },
    {
      title: 'Fastest Responder',
      value: fastestResponder?.agent,
      icon: AccessTimeIcon,
      description: `Lowest FRT (${fastestResponder?.frt ? formatDurationDHM(fastestResponder.frt) : '-'})`,
    },
    {
      title: 'Fastest Resolution',
      value: fastestResolution?.agent,
      icon: FlashOnIcon,
      description: `Lowest ART (${fastestResolution?.art ? formatDurationDHM(fastestResolution.art) : '-'})`,
    },
    {
      title: 'Best SLA Performer',
      value: bestSLA?.agent,
      icon: TrendingUpIcon,
      description: `Highest SLA (${bestSLA?.sla !== undefined ? bestSLA.sla.toFixed(1) + '%' : '-'})`,
    },
    {
      title: 'Most Reliable',
      value: mostReliable?.agent,
      icon: HowToRegIcon,
      description: `Highest FCR with 0 backlog (${mostReliable?.fcr !== undefined ? mostReliable.fcr.toFixed(1) + '%' : '-'})`,
    },
    {
      title: 'Most Improved Agent',
      value: mostImproved?.agent,
      icon: BarChartIcon,
      description: `Biggest score increase (${(mostImproved as any)?.delta !== undefined ? ((mostImproved as any).delta > 0 ? '+' : '') + (mostImproved as any).delta.toFixed(1) : '-'})`,
    },
    {
      title: 'Most Engaged',
      value: mostEngaged?.agent,
      icon: GroupIcon,
      description: `Most tickets handled (${mostEngaged?.vol ?? '-'})`,
    },
  ];

  // Unused function - commented out
  // const safeNum = v => (typeof v === 'number' && !isNaN(v)) ? v : null;
  // Unused function - commented out
  // const safeFixed = v => safeNum(v) !== null ? v.toFixed(1) : '-';

  // File upload functionality commented out - using main upload process instead
  // const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;
  //   // Excel processing moved to main UploadProcess component
  // };

  // Unused function - commented out
  // function transformExcelData(data: any[]) {
  //   // Group by agentName
  //   const agentMap: Record<string, any[]> = {};
  //   data.forEach(row => {
  //     const agentName = row['Agent'] || row['agentName'] || row['Open By'] || row['OPEN BY'] || 'Unknown';
  //     if (!agentMap[agentName]) agentMap[agentName] = [];
  //     agentMap[agentName].push(row);
  //   });
  //   return Object.entries(agentMap).map(([agentName, rows]) => {
  //     const ticketCount = rows.length;
  //     const durations = rows.map(r => {
  //       const open = dayjs(r['Waktu Open'] || r['OPEN TIME']);
  //       const close = dayjs(r['Waktu Close Ticket'] || r['CLOSE TIME']);
  //       return close.isValid() && open.isValid() ? close.diff(open, 'minute') : 0;
  //     }).filter(Boolean);
  //     const totalDuration = durations.reduce((a, b) => a + b, 0);
  //     const avgDuration = durations.length ? totalDuration / durations.length : 0;
  //     const minDuration = durations.length ? Math.min(...durations) : 0;
  //     const maxDuration = durations.length ? Math.max(...durations) : 0;
  //     return {
  //       agentName,
  //       ticketCount,
  //       totalDurationFormatted: formatDurationDHM(totalDuration),
  //       avgDurationFormatted: formatDurationDHM(avgDuration),
  //       minDurationFormatted: formatDurationDHM(minDuration),
  //       maxDurationFormatted: formatDurationDHM(maxDuration),
  //       // Tambahkan field lain sesuai kebutuhan
  //     };
  //   });
  // }

  return (
    <PageWrapper>
      {/* Page Title & Description */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Agent Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Analysis of agent performance and activity in handling tickets during the selected period.</p>
      </div>
      <div className="flex justify-center mb-6">
        <TimeFilter
          startMonth={startMonth}
          setStartMonth={setStartMonth}
          endMonth={endMonth}
          setEndMonth={setEndMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          monthOptions={monthOptions}
          allYearsInData={allYearsInData}
        />
      </div>
      
      {/* Debug Controls */}
      <div className="flex justify-center mb-4">
        <button
          onClick={toggleBacklogDebug}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            backlogDebugEnabled 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {backlogDebugEnabled ? 'Disable' : 'Enable'} Backlog Debug
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {summaryCards.map(s => {
          let iconBg;
          if (s.title === 'Total Active Agents') iconBg = "bg-blue-700";
          else if (s.title === 'Top Overall Agent') iconBg = "bg-blue-700";
          else if (s.title === 'Fastest Responder') iconBg = "bg-purple-500";
          else if (s.title === 'Fastest Resolution') iconBg = "bg-green-600";
          else if (s.title === 'Best SLA Performer') iconBg = "bg-yellow-400";
          else if (s.title === 'Most Reliable') iconBg = "bg-red-500";
          else if (s.title === 'Most Improved Agent') iconBg = "bg-indigo-500";
          else if (s.title === 'Most Engaged') iconBg = "bg-teal-500";
          else iconBg = "bg-gray-500";

          return (
        <SummaryCard
              key={s.title}
              icon={<s.icon className="w-7 h-7 text-white" />}
              title={s.title}
              value={s.value}
              description={s.description}
              iconBg={iconBg}
            />
          );
        })}
      </div>
      {/* Per-Agent Cards with Trendline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {sortedAgentWithScore.map((agent) => {
          // Unused variables - commented out
          // const closedCount = (dataSource.find(a => (a.agent === agent.agent || (a as any).agentName === agent.agent) && typeof (a as any).closedCount !== 'undefined') as any)?.closedCount ?? '-';
          // const scoreTrend = getAgentScoreTrend(agent.agent);
          // Dynamic style for score box based on grade
          let scoreBox = {
            bg: 'bg-yellow-400',
            icon: <StarIcon />, 
            valueColor: 'text-zinc-800',
          };
          if (agent.score >= 75) {
            scoreBox = {
              bg: 'bg-green-500',
              icon: <StarIcon />, 
              valueColor: 'text-white',
            };
          } else if (agent.score >= 60) {
            scoreBox = {
              bg: 'bg-blue-500',
              icon: <StarIcon />, 
              valueColor: 'text-white',
            };
          } else if (agent.score >= 45) {
            scoreBox = {
              bg: 'bg-orange-500',
              icon: <StarIcon />, 
              valueColor: 'text-white',
            };
          } else {
            scoreBox = {
              bg: 'bg-red-500',
              icon: <StarIcon />, 
              valueColor: 'text-white',
            };
          }
          return (
            <div key={agent.agent} className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-zinc-200 dark:border-zinc-800 overflow-hidden h-80" onClick={() => { setSelectedAgent(agent.agent); setModalOpen(true); }} style={{ cursor: 'pointer' }}>
              <div className="flex h-full">
                {/* Left Section - Agent Photo */}
                <div className="w-1/3 bg-gradient-to-br from-white via-blue-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
                  {/* Agent Photo - akan menggunakan foto yang diupload */}
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src={getAgentPhotoPath(agent.agent)} 
                      alt={agent.agent}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        // Fallback jika foto tidak ada
                        const target = e.target as HTMLImageElement;
                        console.warn(`[Photo Error] Failed to load image for agent: "${agent.agent}" at path: ${target.src}`);
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                      onLoad={() => {
                        console.log(`[Photo Success] Successfully loaded image for agent: "${agent.agent}"`);
                      }}
                    />
                    {/* Fallback avatar jika foto tidak ada */}
                    <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold shadow-lg hidden">
                  {agent.agent?.[0] || '?'}
                </div>
                </div>
              </div>
                
                {/* Right Section - Agent Metrics */}
                <div className="w-2/3 p-6 flex flex-col">
                                    {/* Agent Header */}
                  <div className="mb-4">
                    <div className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{agent.agent}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Agent</div>
                  </div>
                  
                  {/* Summary KPIs - Rank & Score */}
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1 bg-black rounded-lg p-3 text-center">
                      <div className="text-white text-2xl font-bold">#{agent.rankNum}</div>
                      <div className="text-white/80 text-xs">Rank</div>
                </div>
                    <div className={`flex-1 ${scoreBox.bg} rounded-lg p-3 text-center`}>
                      <div className={`text-2xl font-bold ${scoreBox.valueColor}`}>{agent.score ?? 0}</div>
                      <div className={`text-xs ${scoreBox.valueColor === 'text-white' ? 'text-white/80' : 'text-zinc-600'}`}>Score</div>
              </div>
                  </div>
                  
                  {/* Detailed Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="flex flex-col items-center">
                  <ListAltIcon className="text-blue-600 mb-1" fontSize="small" />
                      <div className="font-bold text-sm">{agent.vol ?? '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Tiket</div>
                </div>
                    <div className="flex flex-col items-center">
                  <AccessTimeIcon className="text-purple-600 mb-1" fontSize="small" />
                      <div className="font-bold text-sm">{agent.frt ? formatDurationDHM(agent.frt) : '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">FRT</div>
                </div>
                    <div className="flex flex-col items-center">
                      <AccessTimeIcon className="text-red-500 mb-1" fontSize="small" />
                      <div className="font-bold text-sm">{agent.art ? formatDurationDHM(agent.art) : '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">ART</div>
                </div>
                    <div className="flex flex-col items-center">
                  <FlashOnIcon className="text-green-600 mb-1" fontSize="small" />
                      <div className="font-bold text-sm">{agent.fcr !== undefined ? `${agent.fcr.toFixed(1)}%` : '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">FCR</div>
                </div>
                    <div className="flex flex-col items-center">
                  <TrendingUpIcon className="text-yellow-500 mb-1" fontSize="small" />
                      <div className="font-bold text-sm">{agent.sla !== undefined ? `${agent.sla.toFixed(1)}%` : '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">SLA</div>
                </div>
                    <div className="flex flex-col items-center">
                  <MoveToInboxIcon className="text-red-500 mb-1" fontSize="small" />
                      <div className="font-bold text-sm">{agent.backlog ?? 0}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Backlog</div>
                  </div>
              </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full"
                      style={{ 
                        width: `${agent.score || 0}%`, 
                        background: 'linear-gradient(to right, #3b82f6, #22c55e, #fde047)' 
                      }} 
                    />
              </div>
                  
                  {/* Alert Message */}
              {agent.insight && (
                    <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2 text-sm text-yellow-800 dark:text-yellow-200">
                      <LightbulbIcon className="text-yellow-500" fontSize="small" />
                  <span>{agent.insight}</span>
                </div>
              )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Trendline Chart for All Agents */}
      {debouncedTrendData.length > 0 && (
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 mt-6">
          <CardHeader>
            <CardTitle>Agent Ticket Trends per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={debouncedTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {debouncedDatasets.map((ds, idx) => (
                    <linearGradient key={ds.label} id={`colorAgent${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ds.color || TREND_COLORS[idx % TREND_COLORS.length]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={ds.color || TREND_COLORS[idx % TREND_COLORS.length]} stopOpacity={0.08}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <RechartsLegend />
                {debouncedDatasets.map((ds, idx) => (
                  <Area
                    key={ds.label}
                    type="monotone"
                    dataKey={ds.label}
                    stroke={ds.color || TREND_COLORS[idx % TREND_COLORS.length]}
                    fill={`url(#colorAgent${idx})`}
                    name={ds.label}
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {/* Modal drilldown agent */}
      <RadixDialog.Root open={modalOpen} onOpenChange={open => { setModalOpen(open); if (!open) setSelectedAgent(open ? selectedAgent : null); }}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <RadixDialog.Content className="fixed right-0 top-0 h-full w-full md:w-[900px] max-w-full bg-white dark:bg-zinc-900 shadow-2xl z-50 overflow-y-auto">
            <RadixDialog.Title className="sr-only">Agent Detail</RadixDialog.Title>
            {/* Professional Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Agent Photo */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white via-blue-100 to-purple-100 flex items-center justify-center relative overflow-hidden shadow-lg">
                                      <img 
                    src={selectedAgent ? getAgentPhotoPath(selectedAgent) : ''} 
                    alt={selectedAgent}
                    className="w-full h-full object-cover object-center rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.warn(`[Modal Photo Error] Failed to load image for selected agent: "${selectedAgent}" at path: ${target.src}`);
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                    onLoad={() => {
                      console.log(`[Modal Photo Success] Successfully loaded image for selected agent: "${selectedAgent}"`);
                    }}
                  />
                    <div className="w-full h-full rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl font-bold hidden">
                      {selectedAgent?.[0] || '?'}
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{selectedAgent}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Agent Performance Dashboard</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={(e) => setExportYear(e.target.value)}
                    value={exportYear}
                  >
                    <option value="all">All Time</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                  <Button 
                    onClick={exportToPDF}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    <DownloadIcon sx={{ fontSize: 16 }} />
                    Export PDF
                  </Button>
              <RadixDialog.Close asChild>
                    <button className="text-gray-500 hover:text-red-500 text-2xl font-bold focus:outline-none transition-colors duration-150 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close agent detail">&times;</button>
              </RadixDialog.Close>
                </div>
              </div>
            </div>
            {selectedAgent && (
              <>
                {/* KPI Summary Cards */}
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {(() => {
                      const agentData = sortedAgentWithScore.find(a => a.agent === selectedAgent);
                      if (!agentData) return null;
                      
                      return (
                        <>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                <span className="text-white text-lg font-bold">#{agentData.rankNum}</span>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Rank</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">#{agentData.rankNum}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${agentData.score >= 75 ? 'bg-green-500' : agentData.score >= 60 ? 'bg-blue-500' : agentData.score >= 45 ? 'bg-orange-500' : 'bg-red-500'} flex items-center justify-center`}>
                                <span className="text-white text-lg font-bold">{agentData.score}</span>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{agentData.score}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                                <ListAltIcon className="text-white" />
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Tickets</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{agentData.vol || 0}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                                <TrendingUpIcon className="text-white" />
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">SLA</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{agentData.sla ? `${agentData.sla.toFixed(1)}%` : '-'}</div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                {/* Ambil data tren score agent terpilih */}
                {(() => {
                  const scoreTrendArr = getAgentScoreTrend(selectedAgent);
                  const chartData = Array.isArray(scoreTrendArr)
                    ? scoreTrendArr.map((score, i) => ({ month: data.agentMonthlyChart.labels?.[i] || `Month ${i+1}`, score }))
                    : [];
                  return (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">Performance Score Trend</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Monthly score progression</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Score</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
                {/* Header Insight */}
                {(() => {
                  const scoreTrendArr = getAgentScoreTrend(selectedAgent);
                  const avgScore = scoreTrendArr.length ? (scoreTrendArr.reduce((a, b) => a + b, 0) / scoreTrendArr.length).toFixed(1) : '-';
                  let trendBadge = null;
                  if (scoreTrendArr.length > 1) {
                    const diff = scoreTrendArr[scoreTrendArr.length - 1] - scoreTrendArr[scoreTrendArr.length - 2];
                    if (diff > 0) trendBadge = <Badge variant="success" className="ml-2">Trend Up</Badge>;
                    else if (diff < 0) trendBadge = <Badge variant="danger" className="ml-2">Trend Down</Badge>;
                    else trendBadge = <Badge variant="default" className="ml-2">Stable</Badge>;
                  }
                  // Cari bulan terbaik/terburuk
                  let bestMonth = null, worstMonth = null, bestValue = -Infinity, worstValue = Infinity;
                  if (scoreTrendArr.length && agentMonthlyChart && agentMonthlyChart.labels) {
                    scoreTrendArr.forEach((v, i) => {
                      if (v > bestValue) { bestValue = v; bestMonth = agentMonthlyChart.labels[i]; }
                      if (v < worstValue) { worstValue = v; worstMonth = agentMonthlyChart.labels[i]; }
                    });
                  }
                  // Overall trend
                  let mainTrend = '';
                  if (scoreTrendArr.length > 1) {
                    const first = scoreTrendArr[0], last = scoreTrendArr[scoreTrendArr.length-1];
                    if (last > first) mainTrend = 'Performa meningkat secara keseluruhan.';
                    else if (last < first) mainTrend = 'Performa menurun secara keseluruhan.';
                    else mainTrend = 'Performa relatif stabil.';
                  }
                  // --- KPI Breakdown ---
                  // Ambil data tren 3 bulan terakhir untuk setiap KPI
                  const getLastN = (arr: number[], n: number) => arr.slice(-n);
                  const ticketArr = agentMonthlyChart?.datasets?.find(ds => ds.label === selectedAgent)?.data || [];
                  const frtArr = agentMonthlyChart?.datasetsFRT?.find(ds => ds.label === selectedAgent)?.data || [];
                  const artArr = agentMonthlyChart?.datasetsART?.find(ds => ds.label === selectedAgent)?.data || [];
                  const fcrArr = agentMonthlyChart?.datasetsFCR?.find(ds => ds.label === selectedAgent)?.data || [];
                  const slaArr = agentMonthlyChart?.datasetsSLA?.find(ds => ds.label === selectedAgent)?.data || [];
                  const backlogArr = agentMonthlyChart?.datasetsBacklog?.find(ds => ds.label === selectedAgent)?.data || [];
                  // --- Tambahan: total tiket per bulan & persentase handle agent ---
                  const totalTicketPerMonth = agentMonthlyChart?.totalTicketsPerMonth || [];
                  // Persentase handle agent per bulan
                  const agentTicketShare = ticketArr.map((v, i) => {
                    const total = totalTicketPerMonth[i] || 1;
                    let percent = (v / total) * 100;
                    if (!isFinite(percent)) percent = 0;
                    if (percent > 100) return '100%+';
                    return Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(percent) + '%';
                  });
                  // Trend & insight per KPI
                  const kpiTrends = {
                    ticket: getTrendDirection(getLastN(ticketArr, 3)),
                    frt: getTrendDirection(getLastN(frtArr, 3)),
                    art: getTrendDirection(getLastN(artArr, 3)),
                    fcr: getTrendDirection(getLastN(fcrArr, 3)),
                    sla: getTrendDirection(getLastN(slaArr, 3)),
                    backlog: getTrendDirection(getLastN(backlogArr, 3)),
                  };
                  const kpiLabels = {
                    ticket: 'Ticket Volume',
                    frt: 'FRT',
                    art: 'ART',
                    fcr: 'FCR',
                    sla: 'SLA',
                    backlog: 'Backlog',
                  };
                  return (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <LightbulbIcon className="w-5 h-5 text-yellow-500" />
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">Performance Insights</div>
                      </div>
                      
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Score</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgScore}</div>
                          {trendBadge}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Best Month</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{bestMonth}</div>
                          <div className="text-sm text-green-600 dark:text-green-400">{bestValue} points</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Worst Month</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{worstMonth}</div>
                          <div className="text-sm text-red-600 dark:text-red-400">{worstValue} points</div>
                        </div>
                      </div>
                      
                      {/* Overall Trend */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                        <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Overall Performance Trend</div>
                        <div className="text-blue-900 dark:text-blue-100">{mainTrend}</div>
                      </div>
                      
                      {/* KPI Breakdown */}
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">KPI Performance Analysis</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.keys(kpiTrends).map(kpi => (
                            <div key={kpi} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <Badge variant={kpiTrends[kpi]==='up' ? 'success' : kpiTrends[kpi]==='down' ? 'danger' : 'default'}>
                                {kpiTrends[kpi] === 'up' ? '↗' : kpiTrends[kpi] === 'down' ? '↘' : '→'}
                              </Badge>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{kpiLabels[kpi]}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{generateKpiInsight(kpi, kpiTrends[kpi])}</div>
                            {kpi === 'ticket' && agentTicketShare.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">Share: {agentTicketShare.slice(-1)[0]} of total tickets</div>
                            )}
                              </div>
                            </div>
                        ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* Agent Career Report Tabs */}
                <div className="px-6">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                      <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
                        <TimelineIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Overview & Career</span>
                      </TabsTrigger>
                      <TabsTrigger value="performance" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
                        <TrackChangesIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Performance & Insights</span>
                      </TabsTrigger>
                      <TabsTrigger value="trends" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
                        <TrendingUpIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Trends & History</span>
                      </TabsTrigger>
                    </TabsList>

                                     {/* Overview Tab - Summary of All Career Data */}
                   <TabsContent value="overview" className="mt-4">
                        {(() => {
                       // Calculate overview metrics using all career data
                       const agentTickets = allTickets?.filter(t => t.openBy === selectedAgent) || [];
                       
                       if (agentTickets.length === 0) {
                         return (
                           <div className="text-center py-8 text-gray-500">
                             <TimelineIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                             <p>No career data available for this agent.</p>
                           </div>
                         );
                       }
                       
                       // Calculate all career metrics for overview
                       const totalTickets = agentTickets.length;
                       
                       // Tenure calculation
                       const validTickets = agentTickets.filter(t => {
                         if (!t.openTime) return false;
                         const date = new Date(t.openTime);
                         return !isNaN(date.getTime());
                       });
                       
                       const firstTicket = validTickets.length > 0 ? 
                         validTickets.reduce((earliest, t) => {
                           const currentDate = new Date(t.openTime);
                           const earliestDate = new Date(earliest.openTime);
                           return currentDate < earliestDate ? t : earliest;
                         }) : null;
                         
                       const lastTicket = validTickets.length > 0 ? 
                         validTickets.reduce((latest, t) => {
                           const currentDate = new Date(t.openTime);
                           const latestDate = new Date(latest.openTime);
                           return currentDate > latestDate ? t : latest;
                         }) : null;
                       
                       let tenure = 0;
                       if (firstTicket && lastTicket) {
                         const firstDate = new Date(firstTicket.openTime);
                         const lastDate = new Date(lastTicket.openTime);
                         if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
                           tenure = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                         }
                       }
                       
                       // Performance metrics
                       const closedTickets = agentTickets.filter(t => {
                         const status = (t.status || '').trim().toLowerCase();
                         return status.includes('close') || status.includes('closed');
                       }).length;
                       
                       const ahtValues = agentTickets
                         .filter(t => {
                           if (!t.openTime || !t.closeTime) return false;
                           const openDate = new Date(t.openTime);
                           const closeDate = new Date(t.closeTime);
                           return !isNaN(openDate.getTime()) && !isNaN(closeDate.getTime()) && closeDate > openDate;
                         })
                         .map(t => {
                           const open = new Date(t.openTime);
                           const close = new Date(t.closeTime);
                           return (close.getTime() - open.getTime()) / 60000;
                         })
                         .filter(t => t > 0 && t < 10080);
                       
                       const avgAHT = ahtValues.length > 0 ? 
                         ahtValues.reduce((sum, val) => sum + val, 0) / ahtValues.length : 0;
                       
                       const fcrTickets = agentTickets.filter(t => {
                         return !t.handling2 || t.handling2.trim() === '';
                       });
                       const fcrRate = totalTickets > 0 ? (fcrTickets.length / totalTickets) * 100 : 0;
                       
                       const slaCompliant = agentTickets.filter(t => {
                         if (!t.openTime || !t.closeTime) return false;
                         const openDate = new Date(t.openTime);
                         const closeDate = new Date(t.closeTime);
                         if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return false;
                         if (closeDate <= openDate) return false;
                         
                         const diffMin = (closeDate.getTime() - openDate.getTime()) / 60000;
                         return diffMin <= 1440 && diffMin > 0;
                       }).length;
                       const slaRate = totalTickets > 0 ? (slaCompliant / totalTickets) * 100 : 0;
                       
                       const escalated = agentTickets.filter(t => {
                         const handlingFields = [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5];
                         return handlingFields.some(h => h && h.trim() !== '');
                       }).length;
                       const escalationRate = totalTickets > 0 ? (escalated / totalTickets) * 100 : 0;
                       
                       // Calculate CPI for overview
                       const efficiencyScore = Math.max(0, 100 - (avgAHT / 60) * 10);
                       const qualityScore = slaRate;
                       const resolutionScore = fcrRate - escalationRate;
                       const reliabilityScore = Math.max(0, 100 - escalationRate * 5);
                       const productivityScore = Math.min(100, (totalTickets / 100) * 100);
                       
                       const cpi = Math.round(
                         efficiencyScore * 0.25 +
                         qualityScore * 0.30 +
                         resolutionScore * 0.20 +
                         reliabilityScore * 0.15 +
                         productivityScore * 0.10
                       );
                       
                       const getCPILevel = (score) => {
                         if (score >= 90) return { level: 'Platinum', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' };
                         if (score >= 70) return { level: 'Gold', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
                         if (score >= 40) return { level: 'Silver', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
                         return { level: 'Bronze', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
                       };
                       
                       const cpiLevel = getCPILevel(cpi);
                       
                       // Shift breakdown for overview
                          const shiftCount = { Pagi: 0, Siang: 0, Malam: 0 };
                       agentTickets.forEach(t => {
                              if (!t.openTime) return;
                              const hour = new Date(t.openTime).getHours();
                              if (hour >= 6 && hour < 14) shiftCount.Pagi++;
                              else if (hour >= 14 && hour < 22) shiftCount.Siang++;
                              else shiftCount.Malam++;
                            });
                       
                       return (
                         <div className="space-y-6">
                           {/* Career Summary Header */}
                           <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                             <CardContent className="p-6">
                               <div className="flex items-center justify-between">
                                 <div>
                                   <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                     Career Overview - {selectedAgent}
                                   </h3>
                                   <p className="text-gray-600 dark:text-gray-400">
                                     Comprehensive career summary and performance index
                                   </p>
                                 </div>
                                 <div className="text-center">
                                   <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                     {cpi}
                                   </div>
                                   <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cpiLevel.color}`}>
                                     {cpiLevel.level}
                                   </span>
                                 </div>
                               </div>
                             </CardContent>
                           </Card>
                           
                           {/* Key Metrics Grid */}
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                             <Card>
                               <CardContent className="p-4 text-center">
                                 <div className="text-lg font-bold text-blue-600 mb-1">{totalTickets}</div>
                                 <div className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</div>
                                 <div className="text-xs text-gray-500">Career Total</div>
                               </CardContent>
                             </Card>
                             
                             <Card>
                               <CardContent className="p-4 text-center">
                                 <div className="text-lg font-bold text-green-600 mb-1">{tenure}</div>
                                 <div className="text-sm text-gray-600 dark:text-gray-400">Active Days</div>
                                 <div className="text-xs text-gray-500">Career Tenure</div>
                               </CardContent>
                             </Card>
                             
                             <Card>
                               <CardContent className="p-4 text-center">
                                 <div className="text-lg font-bold text-purple-600 mb-1">{slaRate.toFixed(1)}%</div>
                                 <div className="text-sm text-gray-600 dark:text-gray-400">SLA Rate</div>
                                 <div className="text-xs text-gray-500">Quality Metric</div>
                               </CardContent>
                             </Card>
                             
                             <Card>
                               <CardContent className="p-4 text-center">
                                 <div className="text-lg font-bold text-orange-600 mb-1">{fcrRate.toFixed(1)}%</div>
                                 <div className="text-sm text-gray-600 dark:text-gray-400">FCR Rate</div>
                                 <div className="text-xs text-gray-500">Resolution Metric</div>
                               </CardContent>
                             </Card>
                           </div>
                           
                                                       {/* Performance Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUpIcon className="w-5 h-5" />
                                    Performance Summary
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Average Handle Time</span>
                                      <span className="font-semibold">{formatDurationDHM(avgAHT)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Closed Tickets</span>
                                      <span className="font-semibold">{closedTickets} / {totalTickets}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Escalation Rate</span>
                                      <span className="font-semibold">{escalationRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Career Start</span>
                                      <span className="font-semibold">{firstTicket ? new Date(firstTicket.openTime).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <BarChartIcon className="w-5 h-5" />
                                    Shift Distribution
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    {Object.entries(shiftCount).map(([shift, count]) => (
                                      <div key={shift} className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{shift}</span>
                                        <span className="font-semibold">{count} tickets</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                            
                            {/* Quick Insights Summary */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <LightbulbIcon className="w-5 h-5" />
                                  Quick Insights
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        avgAHT > 1440 ? 'bg-red-500' : avgAHT < 720 ? 'bg-green-500' : 'bg-yellow-500'
                                      }`}></div>
                                      <span className="text-sm">
                                        {avgAHT > 1440 ? 'AHT Above Target' : avgAHT < 720 ? 'Excellent AHT' : 'Good AHT Performance'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        slaRate < 85 ? 'bg-red-500' : slaRate > 95 ? 'bg-green-500' : 'bg-yellow-500'
                                      }`}></div>
                                      <span className="text-sm">
                                        {slaRate < 85 ? 'SLA Below Target' : slaRate > 95 ? 'Outstanding SLA' : 'Good SLA Performance'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        fcrRate < 75 ? 'bg-red-500' : 'bg-green-500'
                                      }`}></div>
                                      <span className="text-sm">
                                        {fcrRate < 75 ? 'FCR Below Target' : 'Good FCR Performance'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        escalationRate > 10 ? 'bg-yellow-500' : 'bg-green-500'
                                      }`}></div>
                                      <span className="text-sm">
                                        {escalationRate > 10 ? 'High Escalation Rate' : 'Low Escalation Rate'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                         </div>
                       );
                     })()}
                   </TabsContent>

                  {/* Career Report Tab */}
                  <TabsContent value="career" className="mt-4">
                    {(() => {
                      // Calculate career metrics with proper validation
                      const agentTickets = allTickets?.filter(t => t.openBy === selectedAgent) || [];
                      
                      // Validate and find first/last tickets with proper date handling
                      const validTickets = agentTickets.filter(t => {
                        if (!t.openTime) return false;
                        const date = new Date(t.openTime);
                        return !isNaN(date.getTime());
                      });
                      
                      const firstTicket = validTickets.length > 0 ? 
                        validTickets.reduce((earliest, t) => {
                          const currentDate = new Date(t.openTime);
                          const earliestDate = new Date(earliest.openTime);
                          return currentDate < earliestDate ? t : earliest;
                        }) : null;
                        
                      const lastTicket = validTickets.length > 0 ? 
                        validTickets.reduce((latest, t) => {
                          const currentDate = new Date(t.openTime);
                          const latestDate = new Date(latest.openTime);
                          return currentDate > latestDate ? t : latest;
                        }) : null;
                      
                      // Calculate tenure with validation
                      let tenure = 0;
                      if (firstTicket && lastTicket) {
                        const firstDate = new Date(firstTicket.openTime);
                        const lastDate = new Date(lastTicket.openTime);
                        if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
                          tenure = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                        }
                      }
                      
                      const totalTickets = agentTickets.length;
                      
                      // Calculate closed tickets with proper status validation
                      const closedTickets = agentTickets.filter(t => {
                        const status = (t.status || '').trim().toLowerCase();
                        return status.includes('close') || status.includes('closed');
                      }).length;
                      
                      // Calculate AHT (Average Handle Time) with validation
                      const ahtValues = agentTickets
                        .filter(t => {
                          if (!t.openTime || !t.closeTime) return false;
                          const openDate = new Date(t.openTime);
                          const closeDate = new Date(t.closeTime);
                          return !isNaN(openDate.getTime()) && !isNaN(closeDate.getTime()) && closeDate > openDate;
                        })
                        .map(t => {
                          const open = new Date(t.openTime);
                          const close = new Date(t.closeTime);
                          return (close.getTime() - open.getTime()) / 60000; // in minutes
                        })
                        .filter(t => t > 0 && t < 10080); // Filter out unreasonable values (>1 week)
                      
                      const avgAHT = ahtValues.length > 0 ? 
                        ahtValues.reduce((sum, val) => sum + val, 0) / ahtValues.length : 0;
                      
                      // Calculate FCR (First Contact Resolution) - tickets without second handling
                      const fcrTickets = agentTickets.filter(t => {
                        // Check if there's no second handling (handling2 is empty/null/undefined)
                        return !t.handling2 || t.handling2.trim() === '';
                      });
                      const fcrRate = totalTickets > 0 ? (fcrTickets.length / totalTickets) * 100 : 0;
                      
                      // Calculate SLA compliance with validation
                      const slaCompliant = agentTickets.filter(t => {
                        if (!t.openTime || !t.closeTime) return false;
                        const openDate = new Date(t.openTime);
                        const closeDate = new Date(t.closeTime);
                        if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return false;
                        if (closeDate <= openDate) return false; // Invalid time range
                        
                        const diffMin = (closeDate.getTime() - openDate.getTime()) / 60000;
                        return diffMin <= 1440 && diffMin > 0; // 24 hours max, must be positive
                      }).length;
                      
                      const slaRate = totalTickets > 0 ? (slaCompliant / totalTickets) * 100 : 0;
                      
                      // Calculate FRT (First Response Time) with validation
                      const frtValues = agentTickets
                        .filter(t => {
                          if (!t.openTime || !t.closeHandling) return false;
                          const openDate = new Date(t.openTime);
                          const handlingDate = new Date(t.closeHandling);
                          return !isNaN(openDate.getTime()) && !isNaN(handlingDate.getTime()) && handlingDate > openDate;
                        })
                        .map(t => {
                          const open = new Date(t.openTime);
                          const handling = new Date(t.closeHandling);
                          return (handling.getTime() - open.getTime()) / 60000;
                        })
                        .filter(t => t > 0 && t < 10080); // Filter out unreasonable values
                      
                      const avgFRT = frtValues.length > 0 ? 
                        frtValues.reduce((sum, val) => sum + val, 0) / frtValues.length : 0;
                      
                      // Calculate ART (Average Resolution Time) with validation
                      const artValues = agentTickets
                        .filter(t => {
                          if (!t.openTime || !t.closeTime) return false;
                          const openDate = new Date(t.openTime);
                          const closeDate = new Date(t.closeTime);
                          return !isNaN(openDate.getTime()) && !isNaN(closeDate.getTime()) && closeDate > openDate;
                        })
                        .map(t => {
                          const open = new Date(t.openTime);
                          const close = new Date(t.closeTime);
                          return (close.getTime() - open.getTime()) / 60000;
                        })
                        .filter(t => t > 0 && t < 10080); // Filter out unreasonable values
                      
                      const avgART = artValues.length > 0 ? 
                        artValues.reduce((sum, val) => sum + val, 0) / artValues.length : 0;
                      
                      // Calculate backlog with proper validation
                      const backlog = agentTickets.filter(t => {
                        const status = (t.status || '').trim().toLowerCase();
                        const hasCloseTime = t.closeTime && !isNaN(new Date(t.closeTime).getTime());
                        return !status.includes('close') && !hasCloseTime;
                      }).length;
                      
                      // Calculate escalation rate with validation
                      const escalated = agentTickets.filter(t => {
                        const handlingFields = [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5];
                        return handlingFields.some(h => h && h.trim() !== '');
                      }).length;
                      
                      const escalationRate = totalTickets > 0 ? (escalated / totalTickets) * 100 : 0;
                      
                      // Calculate active days with validation
                      const activeDays = new Set(
                        agentTickets
                          .filter(t => {
                            if (!t.openTime) return false;
                            const date = new Date(t.openTime);
                            return !isNaN(date.getTime());
                          })
                          .map(t => new Date(t.openTime).toDateString())
                      ).size;
                      
                      // Debug logging for data validation
                      if (typeof window !== 'undefined' && selectedAgent) {
                        console.log(`[Agent Career Report] ${selectedAgent} - Data Validation:`, {
                          totalTickets,
                          validTickets: validTickets.length,
                          firstTicket: firstTicket?.openTime,
                          lastTicket: lastTicket?.openTime,
                          tenure,
                          closedTickets,
                          ahtValues: ahtValues.length,
                          avgAHT,
                          fcrTickets: fcrTickets.length,
                          fcrRate,
                          slaCompliant,
                          slaRate,
                          frtValues: frtValues.length,
                          avgFRT,
                          artValues: artValues.length,
                          avgART,
                          backlog,
                          escalated,
                          escalationRate,
                          activeDays
                        });
                      }
                      
                      return (
                        <div className="space-y-6">
                          {/* Career Summary Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <CalendarTodayIcon className="w-8 h-8 text-blue-600" />
                                  <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Tenure</p>
                                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{tenure} days</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <ListAltIcon className="w-8 h-8 text-green-600" />
                                  <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                                    <p className="text-xl font-bold text-green-900 dark:text-green-100">{totalTickets.toLocaleString()}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <AccessTimeIcon className="w-8 h-8 text-purple-600" />
                                  <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg AHT</p>
                                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{formatDurationDHM(avgAHT)}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <TrackChangesIcon className="w-8 h-8 text-orange-600" />
                                  <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">SLA Rate</p>
                                    <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{slaRate.toFixed(1)}%</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Performance Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <TrendingUpIcon className="w-5 h-5" />
                                  Performance Metrics
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-lg font-bold text-blue-600">{fcrRate.toFixed(1)}%</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">FCR Rate</p>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <p className="text-lg font-bold text-green-600">{escalationRate.toFixed(1)}%</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Escalation Rate</p>
                                  </div>
                                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <p className="text-lg font-bold text-purple-600">{formatDurationDHM(avgFRT)}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg FRT</p>
                                  </div>
                                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <p className="text-lg font-bold text-orange-600">{formatDurationDHM(avgART)}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg ART</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <GroupIcon className="w-5 h-5" />
                                  Activity Summary
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Active Days</span>
                                    <span className="font-semibold">{activeDays} days</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Closed Tickets</span>
                                    <span className="font-semibold">{closedTickets.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Backlog</span>
                                    <span className="font-semibold">{backlog}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Resolution Rate</span>
                                    <span className="font-semibold">{totalTickets > 0 ? ((closedTickets / totalTickets) * 100).toFixed(1) : 0}%</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Career Timeline */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarTodayIcon className="w-5 h-5" />
                                Career Timeline
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <p className="font-semibold">Started Active</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {firstTicket ? new Date(firstTicket.openTime).toLocaleDateString('id-ID', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      }) : 'Unknown'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  <div>
                                    <p className="font-semibold">Latest Activity</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {lastTicket ? new Date(lastTicket.openTime).toLocaleDateString('id-ID', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      }) : 'Unknown'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                  <div>
                                    <p className="font-semibold">Career Milestones</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {totalTickets >= 1000 ? '🏆 1000+ Tickets Handled' : 
                                       totalTickets >= 500 ? '🥉 500+ Tickets Handled' :
                                       totalTickets >= 100 ? '🥈 100+ Tickets Handled' : '🚀 Getting Started'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Performance Tab - Career Performance Index */}
                  <TabsContent value="performance" className="mt-4">
                    {(() => {
                      // Calculate CPI (Career Performance Index)
                      const agentTickets = allTickets?.filter(t => t.openBy === selectedAgent) || [];
                      const totalTickets = agentTickets.length;
                      
                      if (totalTickets === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <TrackChangesIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No performance data available for this agent.</p>
                          </div>
                        );
                      }
                      
                      // Calculate all metrics for CPI
                      
                      // AHT calculation
                      const ahtValues = agentTickets
                        .filter(t => {
                          if (!t.openTime || !t.closeTime) return false;
                          const openDate = new Date(t.openTime);
                          const closeDate = new Date(t.closeTime);
                          return !isNaN(openDate.getTime()) && !isNaN(closeDate.getTime()) && closeDate > openDate;
                        })
                        .map(t => {
                          const open = new Date(t.openTime);
                          const close = new Date(t.closeTime);
                          return (close.getTime() - open.getTime()) / 60000;
                        })
                        .filter(t => t > 0 && t < 10080);
                      
                      const avgAHT = ahtValues.length > 0 ? 
                        ahtValues.reduce((sum, val) => sum + val, 0) / ahtValues.length : 0;
                      
                      // FCR calculation
                      const fcrTickets = agentTickets.filter(t => {
                        return !t.handling2 || t.handling2.trim() === '';
                      });
                      const fcrRate = totalTickets > 0 ? (fcrTickets.length / totalTickets) * 100 : 0;
                      
                      // SLA calculation
                      const slaCompliant = agentTickets.filter(t => {
                        if (!t.openTime || !t.closeTime) return false;
                        const openDate = new Date(t.openTime);
                        const closeDate = new Date(t.closeTime);
                        if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return false;
                        if (closeDate <= openDate) return false;
                        
                        const diffMin = (closeDate.getTime() - openDate.getTime()) / 60000;
                        return diffMin <= 1440 && diffMin > 0;
                      }).length;
                      const slaRate = totalTickets > 0 ? (slaCompliant / totalTickets) * 100 : 0;
                      
                      // Escalation calculation
                      const escalated = agentTickets.filter(t => {
                        const handlingFields = [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5];
                        return handlingFields.some(h => h && h.trim() !== '');
                      }).length;
                      const escalationRate = totalTickets > 0 ? (escalated / totalTickets) * 100 : 0;
                      
                      // Tenure calculation
                      const validTickets = agentTickets.filter(t => {
                        if (!t.openTime) return false;
                        const date = new Date(t.openTime);
                        return !isNaN(date.getTime());
                      });
                      
                      const firstTicket = validTickets.length > 0 ? 
                        validTickets.reduce((earliest, t) => {
                          const currentDate = new Date(t.openTime);
                          const earliestDate = new Date(earliest.openTime);
                          return currentDate < earliestDate ? t : earliest;
                        }) : null;
                        
                      const lastTicket = validTickets.length > 0 ? 
                        validTickets.reduce((latest, t) => {
                          const currentDate = new Date(t.openTime);
                          const latestDate = new Date(latest.openTime);
                          return currentDate > latestDate ? t : latest;
                        }) : null;
                      
                      let tenure = 0;
                      if (firstTicket && lastTicket) {
                        const firstDate = new Date(firstTicket.openTime);
                        const lastDate = new Date(lastTicket.openTime);
                        if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
                          tenure = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                        }
                      }
                      
                      // Active days calculation
                      const activeDays = new Set(
                        agentTickets
                          .filter(t => {
                            if (!t.openTime) return false;
                            const date = new Date(t.openTime);
                            return !isNaN(date.getTime());
                          })
                          .map(t => new Date(t.openTime).toDateString())
                      ).size;
                      
                      // Calculate CPI components with enhanced formulas
                      
                      // 1. Efficiency Score (25%) - Enhanced AHT calculation with tenure consideration
                      const tenureMonths = Math.max(1, tenure / 30); // Convert days to months
                      const expectedAHT = Math.max(30, 60 - (tenureMonths * 2)); // Expected AHT decreases with experience
                      const ahtEfficiency = Math.max(0, Math.min(100, 100 - ((avgAHT - expectedAHT) / expectedAHT) * 50));
                      const efficiencyScore = Math.round(ahtEfficiency);
                      
                      // 2. Quality Score (30%) - Enhanced with multiple quality indicators
                      const slaWeight = 0.6;
                      const fcrWeight = 0.3;
                      const escalationWeight = 0.1;
                      
                      const slaQuality = slaRate;
                      const fcrQuality = fcrRate;
                      const escalationQuality = Math.max(0, 100 - escalationRate * 2);
                      
                      const qualityScore = Math.round(
                        slaQuality * slaWeight +
                        fcrQuality * fcrWeight +
                        escalationQuality * escalationWeight
                      );
                      
                      // 3. Resolution Score (20%) - Enhanced with proper bounds and context
                      const baseResolution = fcrRate;
                      const escalationPenalty = escalationRate * 1.5; // Increased penalty
                      const resolutionScore = Math.max(0, Math.min(100, baseResolution - escalationPenalty));
                      
                      // 4. Reliability Score (15%) - Enhanced with attendance and consistency
                      const attendanceRate = activeDays / Math.max(1, tenure); // Daily attendance rate
                      const escalationPenaltyReliability = escalationRate * 3;
                      const consistencyBonus = Math.min(20, (100 - Math.abs(slaRate - fcrRate)) / 5); // Bonus for consistent performance
                      
                      const reliabilityScore = Math.max(0, Math.min(100, 
                        attendanceRate * 100 - escalationPenaltyReliability + consistencyBonus
                      ));
                      
                      // 5. Productivity Score (10%) - Enhanced with tenure-adjusted volume
                      const expectedTicketsPerMonth = 50; // Base expectation
                      const actualTicketsPerMonth = totalTickets / Math.max(1, tenureMonths);
                      const productivityRatio = actualTicketsPerMonth / expectedTicketsPerMonth;
                      const productivityScore = Math.min(100, Math.max(0, productivityRatio * 100));
                      
                      // Calculate CPI with weights
                      const cpi = Math.round(
                        efficiencyScore * 0.25 +
                        qualityScore * 0.30 +
                        resolutionScore * 0.20 +
                        reliabilityScore * 0.15 +
                        productivityScore * 0.10
                      );
                      
                      // Determine CPI level
                      const getCPILevel = (score) => {
                        if (score >= 90) return { level: 'Platinum', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' };
                        if (score >= 70) return { level: 'Gold', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
                        if (score >= 40) return { level: 'Silver', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
                        return { level: 'Bronze', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
                      };
                      
                      const cpiLevel = getCPILevel(cpi);
                      
                      return (
                        <div className="space-y-6">
                          {/* CPI Header */}
                          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    Career Performance Index
                                  </h3>
                                  <p className="text-gray-600 dark:text-gray-400">
                                    Comprehensive performance score for {selectedAgent}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                    {cpi}
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cpiLevel.color}`}>
                                    {cpiLevel.level}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* CPI Components */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-blue-600 mb-1">{efficiencyScore.toFixed(0)}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency (25%)</div>
                                <div className="text-xs text-gray-500">AHT: {formatDurationDHM(avgAHT)}</div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-green-600 mb-1">{qualityScore.toFixed(0)}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Quality (30%)</div>
                                <div className="text-xs text-gray-500">SLA: {slaRate.toFixed(1)}%</div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-purple-600 mb-1">{resolutionScore.toFixed(0)}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Resolution (20%)</div>
                                <div className="text-xs text-gray-500">FCR: {fcrRate.toFixed(1)}%</div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-orange-600 mb-1">{reliabilityScore.toFixed(0)}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Reliability (15%)</div>
                                <div className="text-xs text-gray-500">Esc: {escalationRate.toFixed(1)}%</div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-indigo-600 mb-1">{productivityScore.toFixed(0)}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Productivity (10%)</div>
                                <div className="text-xs text-gray-500">Vol: {totalTickets}</div>
                              </CardContent>
                            </Card>
                          </div>
                          
                          {/* Enhanced CPI Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <BarChartIcon className="w-5 h-5" />
                                  CPI Calculation Details
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-3">
                                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">Efficiency Score ({efficiencyScore.toFixed(0)})</div>
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                      <div>• Expected AHT: {formatDurationDHM(expectedAHT)}</div>
                                      <div>• Actual AHT: {formatDurationDHM(avgAHT)}</div>
                                      <div>• Tenure: {tenure} days ({tenureMonths.toFixed(1)} months)</div>
                                      <div>• Performance: {avgAHT <= expectedAHT ? 'Above Expectation' : 'Below Expectation'}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="font-semibold text-green-800 dark:text-green-200 mb-1">Quality Score ({qualityScore.toFixed(0)})</div>
                                    <div className="text-sm text-green-700 dark:text-green-300">
                                      <div>• SLA Rate: {slaRate.toFixed(1)}% (Weight: 60%)</div>
                                      <div>• FCR Rate: {fcrRate.toFixed(1)}% (Weight: 30%)</div>
                                      <div>• Escalation Quality: {escalationQuality.toFixed(0)} (Weight: 10%)</div>
                                      <div>• Overall: {qualityScore >= 80 ? 'Excellent' : qualityScore >= 60 ? 'Good' : 'Needs Improvement'}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <div className="font-semibold text-purple-800 dark:text-purple-200 mb-1">Resolution Score ({resolutionScore.toFixed(0)})</div>
                                    <div className="text-sm text-purple-700 dark:text-purple-300">
                                      <div>• Base FCR: {fcrRate.toFixed(1)}%</div>
                                      <div>• Escalation Penalty: -{escalationPenalty.toFixed(1)}</div>
                                      <div>• Net Score: {resolutionScore.toFixed(0)}</div>
                                      <div>• Status: {resolutionScore >= 70 ? 'Strong' : resolutionScore >= 50 ? 'Moderate' : 'Weak'}</div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <TrackChangesIcon className="w-5 h-5" />
                                  Performance Targets & Benchmarks
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <span className="text-sm">AHT Target</span>
                                    <span className="font-semibold">≤ {formatDurationDHM(expectedAHT)}</span>
                                  </div>
                                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <span className="text-sm">SLA Target</span>
                                    <span className="font-semibold">≥ 85%</span>
                                  </div>
                                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <span className="text-sm">FCR Target</span>
                                    <span className="font-semibold">≥ 75%</span>
                                  </div>
                                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <span className="text-sm">Escalation Target</span>
                                    <span className="font-semibold">≤ 10%</span>
                                  </div>
                                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <span className="text-sm">Productivity Target</span>
                                    <span className="font-semibold">≥ 50 tickets/month</span>
                                  </div>
                                </div>
                                
                                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                  <div className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Performance Summary</div>
                                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                    {(() => {
                                      const targets = {
                                        aht: avgAHT <= expectedAHT,
                                        sla: slaRate >= 85,
                                        fcr: fcrRate >= 75,
                                        escalation: escalationRate <= 10,
                                        productivity: productivityRatio >= 1
                                      };
                                      
                                      const metTargets = Object.values(targets).filter(Boolean).length;
                                      const totalTargets = Object.keys(targets).length;
                                      const percentage = (metTargets / totalTargets) * 100;
                                      
                                      return (
                                        <div>
                                          <div>• Targets Met: {metTargets}/{totalTargets} ({percentage.toFixed(0)}%)</div>
                                          <div>• Overall Grade: {cpiLevel.level}</div>
                                          <div>• Recommendation: {
                                            percentage >= 80 ? 'Excellent performance, consider for advancement' :
                                            percentage >= 60 ? 'Good performance, focus on improvement areas' :
                                            'Needs improvement, consider additional training'
                                          }</div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                          
                          {/* Performance Breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <TrendingUpIcon className="w-5 h-5" />
                                  Performance Metrics
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Average Handle Time</span>
                                    <span className="font-semibold">{formatDurationDHM(avgAHT)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">First Contact Resolution</span>
                                    <span className="font-semibold">{fcrRate.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">SLA Compliance</span>
                                    <span className="font-semibold">{slaRate.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Escalation Rate</span>
                                    <span className="font-semibold">{escalationRate.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <TrackChangesIcon className="w-5 h-5" />
                                  Performance Targets
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">AHT Target</span>
                                    <span className="font-semibold">≤ 24h</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">FCR Target</span>
                                    <span className="font-semibold">≥ 75%</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">SLA Target</span>
                                    <span className="font-semibold">≥ 85%</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Escalation Target</span>
                                    <span className="font-semibold">≤ 10%</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Auto Insights Tab */}
                  <TabsContent value="insights" className="mt-4">
                    {(() => {
                      const agentTickets = allTickets?.filter(t => t.openBy === selectedAgent) || [];
                      const totalTickets = agentTickets.length;
                      
                      if (totalTickets === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <LightbulbIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No insights available for this agent.</p>
                          </div>
                        );
                      }
                      
                      // Calculate metrics for insights
                      const ahtValues = agentTickets
                        .filter(t => {
                          if (!t.openTime || !t.closeTime) return false;
                          const openDate = new Date(t.openTime);
                          const closeDate = new Date(t.closeTime);
                          return !isNaN(openDate.getTime()) && !isNaN(closeDate.getTime()) && closeDate > openDate;
                        })
                        .map(t => {
                          const open = new Date(t.openTime);
                          const close = new Date(t.closeTime);
                          return (close.getTime() - open.getTime()) / 60000;
                        })
                        .filter(t => t > 0 && t < 10080);
                      
                      const avgAHT = ahtValues.length > 0 ? 
                        ahtValues.reduce((sum, val) => sum + val, 0) / ahtValues.length : 0;
                      
                      const fcrTickets = agentTickets.filter(t => {
                        return !t.handling2 || t.handling2.trim() === '';
                      });
                      const fcrRate = totalTickets > 0 ? (fcrTickets.length / totalTickets) * 100 : 0;
                      
                      const slaCompliant = agentTickets.filter(t => {
                        if (!t.openTime || !t.closeTime) return false;
                        const openDate = new Date(t.openTime);
                        const closeDate = new Date(t.closeTime);
                        if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return false;
                        if (closeDate <= openDate) return false;
                        
                        const diffMin = (closeDate.getTime() - openDate.getTime()) / 60000;
                        return diffMin <= 1440 && diffMin > 0;
                      }).length;
                      const slaRate = totalTickets > 0 ? (slaCompliant / totalTickets) * 100 : 0;
                      
                      const escalated = agentTickets.filter(t => {
                        const handlingFields = [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5];
                        return handlingFields.some(h => h && h.trim() !== '');
                      }).length;
                      const escalationRate = totalTickets > 0 ? (escalated / totalTickets) * 100 : 0;
                      
                      // Generate insights based on metrics
                      const insights = [];
                      
                      // Efficiency insights
                      if (avgAHT > 1440) {
                        insights.push({
                          category: 'Efficiency',
                          impact: 'high',
                          title: 'AHT Above Target',
                          description: `Average Handle Time (${formatDurationDHM(avgAHT)}) is above 24-hour target.`,
                          recommendation: 'Review ticket handling process and identify bottlenecks.',
                          color: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        });
                      } else if (avgAHT < 720) {
                        insights.push({
                          category: 'Efficiency',
                          impact: 'medium',
                          title: 'Excellent AHT Performance',
                          description: `Average Handle Time (${formatDurationDHM(avgAHT)}) is well below target.`,
                          recommendation: 'Share best practices with team members.',
                          color: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        });
                      }
                      
                      // Quality insights
                      if (slaRate < 85) {
                        insights.push({
                          category: 'Quality',
                          impact: 'high',
                          title: 'SLA Below Target',
                          description: `SLA compliance rate (${slaRate.toFixed(1)}%) is below 85% target.`,
                          recommendation: 'Focus on faster ticket resolution and prioritize urgent cases.',
                          color: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        });
                      } else if (slaRate > 95) {
                        insights.push({
                          category: 'Quality',
                          impact: 'medium',
                          title: 'Outstanding SLA Performance',
                          description: `SLA compliance rate (${slaRate.toFixed(1)}%) exceeds 95%.`,
                          recommendation: 'Excellent performance! Maintain current standards.',
                          color: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        });
                      }
                      
                      // Resolution insights
                      if (fcrRate < 75) {
                        insights.push({
                          category: 'Resolution',
                          impact: 'high',
                          title: 'FCR Below Target',
                          description: `First Contact Resolution rate (${fcrRate.toFixed(1)}%) is below 75% target.`,
                          recommendation: 'Review knowledge base and improve first-contact resolution skills.',
                          color: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        });
                      }
                      
                      if (escalationRate > 10) {
                        insights.push({
                          category: 'Resolution',
                          impact: 'medium',
                          title: 'High Escalation Rate',
                          description: `Escalation rate (${escalationRate.toFixed(1)}%) is above 10% threshold.`,
                          recommendation: 'Identify common escalation reasons and provide additional training.',
                          color: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                        });
                      }
                      
                      // Volume insights
                      if (totalTickets > 500) {
                        insights.push({
                          category: 'Productivity',
                          impact: 'medium',
                          title: 'High Volume Handler',
                          description: `Handled ${totalTickets} tickets - excellent productivity.`,
                          recommendation: 'Consider mentoring opportunities for newer agents.',
                          color: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        });
                      }
                      
                      return (
                        <div className="space-y-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <LightbulbIcon className="w-5 h-5" />
                                Auto Insights & Recommendations
                              </CardTitle>
                                                             <p className="text-sm text-muted-foreground">
                                 AI-powered insights based on performance analysis
                               </p>
                            </CardHeader>
                            <CardContent>
                              {insights.length > 0 ? (
                                <div className="space-y-4">
                                  {insights.map((insight, index) => (
                                    <div key={index} className={`p-4 rounded-lg border ${insight.color}`}>
                                      <div className="flex items-start gap-3">
                                        <div className={`w-2 h-2 rounded-full mt-2 ${
                                          insight.impact === 'high' ? 'bg-red-500' :
                                          insight.impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}></div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                              {insight.title}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                              insight.impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                              insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            }`}>
                                              {insight.impact.toUpperCase()}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                            {insight.description}
                                          </p>
                                          <div className="bg-white dark:bg-gray-800 rounded p-3">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                              Recommendation:
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                              {insight.recommendation}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <LightbulbIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                  <p>No specific insights at this time. Performance is within normal ranges.</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Trends Tab */}
                  <TabsContent value="trends" className="mt-4">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUpIcon className="w-5 h-5" />
                            Performance Trends (Last 12 Months)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={(() => {
                              const scoreTrendArr = getAgentScoreTrend(selectedAgent);
                              return Array.isArray(scoreTrendArr)
                                ? scoreTrendArr.map((score, i) => ({ 
                                    month: data.agentMonthlyChart.labels?.[i] || `Month ${i+1}`, 
                                    score,
                                    trend: score > 60 ? 'Good' : score > 45 ? 'Fair' : 'Needs Improvement'
                                  }))
                                : [];
                            })()}>
                              <defs>
                                <linearGradient id="colorScoreTrend" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="month" />
                              <YAxis domain={[0, 100]} />
                              <CartesianGrid strokeDasharray="3 3" />
                              <RechartsTooltip />
                              <Area type="monotone" dataKey="score" stroke="#3b82f6" fill="url(#colorScoreTrend)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Details Tab */}
                  <TabsContent value="details" className="mt-4">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <BarChartIcon className="w-5 h-5" />
                            Detailed Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Metric</th>
                                  <th className="text-right py-2">Value</th>
                                  <th className="text-right py-2">Target</th>
                                  <th className="text-right py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody className="space-y-2">
                                {(() => {
                                  const agentTickets = allTickets?.filter(t => t.openBy === selectedAgent) || [];
                                  const totalTickets = agentTickets.length;
                                  
                                  // Calculate closed tickets with proper validation
                                  const closedTickets = agentTickets.filter(t => {
                                    const status = (t.status || '').trim().toLowerCase();
                                    return status.includes('close') || status.includes('closed');
                                  }).length;
                                  
                                  // Calculate SLA compliance with validation
                                  const slaCompliant = agentTickets.filter(t => {
                                    if (!t.openTime || !t.closeTime) return false;
                                    const openDate = new Date(t.openTime);
                                    const closeDate = new Date(t.closeTime);
                                    if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return false;
                                    if (closeDate <= openDate) return false; // Invalid time range
                                    
                                    const diffMin = (closeDate.getTime() - openDate.getTime()) / 60000;
                                    return diffMin <= 1440 && diffMin > 0; // 24 hours max, must be positive
                                  }).length;
                                  
                                  // Calculate FCR with validation
                                  const fcrTickets = agentTickets.filter(t => {
                                    return !t.handling2 || t.handling2.trim() === '';
                                  });
                                  
                                  // Calculate escalation with validation
                                  const escalated = agentTickets.filter(t => {
                                    const handlingFields = [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5];
                                    return handlingFields.some(h => h && h.trim() !== '');
                                  }).length;
                                  
                                  const metrics = [
                                    { name: 'Total Tickets', value: totalTickets, target: 'N/A', status: 'info' },
                                    { name: 'Closed Tickets', value: closedTickets, target: totalTickets, status: closedTickets === totalTickets ? 'success' : 'warning' },
                                    { name: 'SLA Compliance', value: `${((slaCompliant / totalTickets) * 100).toFixed(1)}%`, target: '85%', status: (slaCompliant / totalTickets) * 100 >= 85 ? 'success' : 'warning' },
                                    { name: 'FCR Rate', value: `${((fcrTickets.length / totalTickets) * 100).toFixed(1)}%`, target: '75%', status: (fcrTickets.length / totalTickets) * 100 >= 75 ? 'success' : 'warning' },
                                    { name: 'Escalation Rate', value: `${((escalated / totalTickets) * 100).toFixed(1)}%`, target: '<10%', status: (escalated / totalTickets) * 100 < 10 ? 'success' : 'warning' },
                                  ];
                                  
                                  return metrics.map((metric, idx) => (
                                    <tr key={idx} className="border-b">
                                      <td className="py-2">{metric.name}</td>
                                      <td className="text-right py-2 font-mono">{metric.value}</td>
                                      <td className="text-right py-2 text-gray-500">{metric.target}</td>
                                      <td className="text-right py-2">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                          metric.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                          metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                        }`}>
                                          {metric.status === 'success' ? '✓ Good' : 
                                           metric.status === 'warning' ? '⚠ Needs Attention' : 'ℹ Info'}
                                        </span>
                                      </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
    </div>
              </>
            )}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </PageWrapper>
  );
};

export default AgentAnalytics; 