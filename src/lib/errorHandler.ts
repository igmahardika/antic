// Enhanced Error Handling Utility
export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

export class AppError extends Error {
  public code: string;
  public details?: any;
  public timestamp: string;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export const ErrorCodes = {
  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_TIMEOUT: 'API_TIMEOUT',
  CORS_ERROR: 'CORS_ERROR',
  
  // File Upload Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  HEADER_MISMATCH: 'HEADER_MISMATCH',
  PARSE_ERROR: 'PARSE_ERROR',
  
  // Database Errors
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  
  // Authentication Errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  
  // General Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR'
} as const;

export const createError = (code: keyof typeof ErrorCodes, message: string, details?: any): AppError => {
  return new AppError(ErrorCodes[code], message, details);
};

export const logError = (error: Error | AppError, context?: string): void => {
  const errorInfo: ErrorInfo = {
    code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
    message: error.message,
    details: error instanceof AppError ? error.details : undefined,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.error(`[${context || 'APP'}] Error:`, errorInfo);
  
  // Send to error tracking service (if available)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement error tracking service
    // sendErrorToService(errorInfo);
  }
};

export const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = 'An error occurred';
  let errorCode = 'API_ERROR';
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.error || errorData.message || errorMessage;
    errorCode = errorData.code || errorCode;
  } catch {
    // If response is not JSON, use status text
    errorMessage = response.statusText || errorMessage;
  }

  const error = createError(
    errorCode as keyof typeof ErrorCodes || 'UNKNOWN_ERROR',
    errorMessage,
    { status: response.status, statusText: response.statusText }
  );

  logError(error, 'API');
  throw error;
};

export const handleFileUploadError = (error: any, fileName?: string): AppError => {
  let code: keyof typeof ErrorCodes = 'UNKNOWN_ERROR';
  let message = 'File upload failed';

  if (error.name === 'FileUploadError') {
    code = 'FILE_TOO_LARGE';
    message = 'File size exceeds maximum limit';
  } else if (error.message.includes('header')) {
    code = 'HEADER_MISMATCH';
    message = 'File headers do not match expected format';
  } else if (error.message.includes('parse')) {
    code = 'PARSE_ERROR';
    message = 'Failed to parse file content';
  } else if (error.message.includes('type')) {
    code = 'INVALID_FILE_TYPE';
    message = 'File type not supported';
  }

  const appError = createError(code, message, { fileName });
  logError(appError, 'FILE_UPLOAD');
  return appError;
};

export const showUserFriendlyError = (error: AppError | Error): string => {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'FILE_TOO_LARGE':
        return 'File terlalu besar. Maksimal ukuran file adalah 10MB.';
      case 'INVALID_FILE_TYPE':
        return 'Tipe file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV (.csv).';
      case 'HEADER_MISMATCH':
        return 'Format file tidak sesuai. Silakan download template dan gunakan format yang benar.';
      case 'PARSE_ERROR':
        return 'Gagal membaca file. Pastikan file tidak rusak dan format sesuai.';
      case 'NETWORK_ERROR':
        return 'Koneksi internet bermasalah. Silakan coba lagi.';
      case 'API_TIMEOUT':
        return 'Server tidak merespons. Silakan coba lagi dalam beberapa saat.';
      case 'AUTH_REQUIRED':
        return 'Sesi Anda telah berakhir. Silakan login kembali.';
      case 'INVALID_CREDENTIALS':
        return 'Username atau password salah.';
      default:
        return error.message || 'Terjadi kesalahan. Silakan coba lagi.';
    }
  }
  
  return error.message || 'Terjadi kesalahan. Silakan coba lagi.';
};

export const setupGlobalErrorHandler = (): void => {
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), 'GLOBAL');
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(new Error(event.reason), 'UNHANDLED_PROMISE');
  });
};

// Initialize global error handler
if (typeof window !== 'undefined') {
  setupGlobalErrorHandler();
} 