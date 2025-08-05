// Monitoring and Logging Utility
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  context?: string;
}

export interface UserAction {
  action: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  details?: any;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  checks: {
    database: boolean;
    api: boolean;
    fileSystem: boolean;
    memory: boolean;
  };
  timestamp: string;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private userActions: UserAction[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private initializeMonitoring(): void {
    // Monitor page load performance
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        this.recordPerformanceMetric('page_load', performance.now(), 'ms');
      });

      // Monitor API calls
      this.interceptFetch();
    }
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0] as string;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordPerformanceMetric('api_call', duration, 'ms', url);
        
        if (!response.ok) {
          this.recordUserAction('api_error', { url, status: response.status });
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordPerformanceMetric('api_error', duration, 'ms', url);
        this.recordUserAction('api_error', { url, error: error.message });
        throw error;
      }
    };
  }

  public recordPerformanceMetric(name: string, value: number, unit: string, context?: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      context
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERFORMANCE] ${name}: ${value}${unit}${context ? ` (${context})` : ''}`);
    }
  }

  public recordUserAction(action: string, details?: any): void {
    const userAction: UserAction = {
      action,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details
    };

    this.userActions.push(userAction);
    
    // Keep only last 500 actions
    if (this.userActions.length > 500) {
      this.userActions = this.userActions.slice(-500);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[USER_ACTION] ${action}:`, details);
    }
  }

  public async checkSystemHealth(): Promise<SystemHealth> {
    const checks = {
      database: false,
      api: false,
      fileSystem: false,
      memory: false
    };

    try {
      // Check API health
      const apiResponse = await fetch('/api/health');
      checks.api = apiResponse.ok;
    } catch {
      checks.api = false;
    }

    // Check memory usage
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      checks.memory = memory.usedJSHeapSize < memory.jsHeapSizeLimit * 0.8;
    } else {
      checks.memory = true; // Assume OK if not available
    }

    // Check file system (IndexedDB)
    try {
      const db = await import('./db').then(m => m.db);
      await db.open();
      checks.fileSystem = true;
    } catch {
      checks.fileSystem = false;
    }

    // Database check would require API call
    checks.database = checks.api; // Assume same as API for now

    const status = Object.values(checks).every(check => check) ? 'healthy' : 
                   Object.values(checks).some(check => check) ? 'warning' : 'error';

    const health: SystemHealth = {
      status,
      checks,
      timestamp: new Date().toISOString()
    };

    return health;
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getUserActions(): UserAction[] {
    return [...this.userActions];
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public clearUserActions(): void {
    this.userActions = [];
  }

  public generateReport(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp) > oneHourAgo);
    const recentActions = this.userActions.filter(a => new Date(a.timestamp) > oneHourAgo);

    const apiMetrics = recentMetrics.filter(m => m.name === 'api_call');
    const avgApiResponseTime = apiMetrics.length > 0 
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length 
      : 0;

    const errorActions = recentActions.filter(a => a.action.includes('error'));
    const errorRate = recentActions.length > 0 
      ? (errorActions.length / recentActions.length) * 100 
      : 0;

    return {
      sessionId: this.sessionId,
      timestamp: now.toISOString(),
      metrics: {
        total: recentMetrics.length,
        apiCalls: apiMetrics.length,
        avgApiResponseTime: Math.round(avgApiResponseTime * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100
      },
      actions: {
        total: recentActions.length,
        errors: errorActions.length,
        topActions: this.getTopActions(recentActions)
      }
    };
  }

  private getTopActions(actions: UserAction[]): { action: string; count: number }[] {
    const actionCounts: { [key: string]: number } = {};
    
    actions.forEach(action => {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
    });

    return Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

// Create singleton instance
export const monitoringService = new MonitoringService();

// Export convenience functions
export const recordMetric = (name: string, value: number, unit: string, context?: string) => {
  monitoringService.recordPerformanceMetric(name, value, unit, context);
};

export const recordAction = (action: string, details?: any) => {
  monitoringService.recordUserAction(action, details);
};

export const checkHealth = () => monitoringService.checkSystemHealth();
export const getMetrics = () => monitoringService.getMetrics();
export const getActions = () => monitoringService.getUserActions();
export const generateReport = () => monitoringService.generateReport(); 