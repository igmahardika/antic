// Script test untuk memverifikasi parsing durasi
// Jalankan: node test-duration-parsing.js

// Simulasi fungsi toMinutes dari incidentUtils.ts
function toMinutes(v) {
  if (v == null || v === '') return 0;
  if (v instanceof Date) return v.getUTCHours() * 60 + v.getUTCMinutes() + Math.round(v.getUTCSeconds() / 60);
  
  const s = String(v).trim();
  if (!s) return 0;
  
  // Handle Excel time serial numbers (e.g., 0.5 = 12:00, 0.25 = 6:00)
  const excelTime = Number(s);
  if (Number.isFinite(excelTime) && excelTime > 0 && excelTime < 1) {
    // Excel time: fraction of 24 hours
    const totalMinutes = Math.round(excelTime * 24 * 60);
    return totalMinutes;
  }
  
  // Parse HH:MM:SS format
  const hhmmssRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/;
  const hhmmssMatch = s.match(hhmmssRegex);
  if (hhmmssMatch) {
    const [, hours, minutes, seconds] = hhmmssMatch;
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const s_sec = parseInt(seconds, 10);
    
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && s_sec >= 0 && s_sec <= 59) {
      const totalMinutes = h * 60 + m + Math.round(s_sec / 60);
      return totalMinutes;
    }
  }
  
  // Handle HH:MM format (prioritas tinggi setelah HH:MM:SS)
  const hhmmRegex = /^(\d{1,2}):(\d{2})$/;
  const hhmmMatch = s.match(hhmmRegex);
  if (hhmmMatch) {
    const [, hours, minutes] = hhmmMatch;
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      const totalMinutes = h * 60 + m;
      return totalMinutes;
    }
  }
  
  // Handle various time formats
  const timeFormats = [
    /^(\d+)h\s*(\d+)m$/, // Xh Ym
    /^(\d+)h$/, // Xh
    /^(\d+)m$/, // Xm
    /^(\d+)\s*hours?\s*(\d+)\s*minutes?$/i, // X hours Y minutes
    /^(\d+)\s*hours?$/i, // X hours
    /^(\d+)\s*minutes?$/i, // X minutes
  ];
  
  for (const format of timeFormats) {
    const match = s.match(format);
    if (match) {
      if (format.source.includes('h\\s*\\d+m') || format.source.includes('\\d+h\\s*\\d+m')) {
        // Xh Ym format
        const [, hours, minutes] = match;
        return (+hours) * 60 + (+minutes);
      } else if (format.source.includes('\\d+h$')) {
        // Xh format
        const [, hours] = match;
        return (+hours) * 60;
      } else if (format.source.includes('\\d+m$')) {
        // Xm format
        const [, minutes] = match;
        return +minutes;
      } else if (format.source.includes('hours.*minutes')) {
        // X hours Y minutes format
        const [, hours, minutes] = match;
        return (+hours) * 60 + (+minutes);
      } else if (format.source.includes('hours')) {
        // X hours format
        const [, hours] = match;
        return (+hours) * 60;
      } else if (format.source.includes('minutes')) {
        // X minutes format
        const [, minutes] = match;
        return +minutes;
      }
    }
  }
  
  // Handle numeric values (assume minutes if reasonable, hours if large)
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n > 0 && n < 1000) {
      // Likely minutes
      return Math.round(n);
    } else if (n >= 1000) {
      // Likely seconds, convert to minutes
      const minutes = Math.round(n / 60);
      return minutes;
    }
  }
  
  // If we reach here, the format wasn't recognized
  return 0;
}

// Test cases untuk berbagai format durasi
const testCases = [
  // HH:MM:SS format (format yang diharapkan dari Excel)
  { input: '04:00:00', expected: 240, description: '4 hours in HH:MM:SS' },
  { input: '02:30:00', expected: 150, description: '2.5 hours in HH:MM:SS' },
  { input: '01:45:30', expected: 106, description: '1 hour 45 minutes 30 seconds' },
  { input: '00:30:00', expected: 30, description: '30 minutes in HH:MM:SS' },
  
  // HH:MM format
  { input: '04:00', expected: 240, description: '4 hours in HH:MM' },
  { input: '02:30', expected: 150, description: '2.5 hours in HH:MM' },
  { input: '00:30', expected: 30, description: '30 minutes in HH:MM' },
  
  // Excel time serial numbers
  { input: 0.5, expected: 720, description: 'Excel time 0.5 (12 hours)' },
  { input: 0.25, expected: 360, description: 'Excel time 0.25 (6 hours)' },
  { input: 0.041666666666666664, expected: 60, description: 'Excel time ~1 hour' },
  
  // Text formats
  { input: '4h 30m', expected: 270, description: '4 hours 30 minutes' },
  { input: '2h', expected: 120, description: '2 hours' },
  { input: '45m', expected: 45, description: '45 minutes' },
  { input: '2 hours 30 minutes', expected: 150, description: '2 hours 30 minutes' },
  { input: '1 hour', expected: 60, description: '1 hour' },
  { input: '30 minutes', expected: 30, description: '30 minutes' },
  
  // Numeric values
  { input: 240, expected: 240, description: '240 minutes as number' },
  { input: 3600, expected: 60, description: '3600 seconds as number' },
  
  // Edge cases
  { input: '', expected: 0, description: 'Empty string' },
  { input: null, expected: 0, description: 'Null value' },
  { input: undefined, expected: 0, description: 'Undefined value' },
  { input: 'invalid', expected: 0, description: 'Invalid format' },
];

console.log('🧪 Testing Duration Parsing...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = toMinutes(testCase.input);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}" -> ${result} minutes (expected: ${testCase.expected})`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}" -> ${result} minutes (expected: ${testCase.expected})`);
  }
  console.log('');
});

console.log('📊 Test Results:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All duration parsing tests passed!');
  console.log('✅ The duration parsing function is working correctly.');
} else {
  console.log('\n⚠️ Some tests failed. Please review the parsing logic.');
}

// Test specific kolom yang disebutkan user
console.log('\n🔍 Testing Specific Columns:');
const specificColumns = [
  { name: 'Duration', values: ['04:00:00', '02:30:00', '01:45:30'] },
  { name: 'Duration Vendor', values: ['03:30:00', '02:15:00', '01:30:00'] },
  { name: 'Total Duration Pause', values: ['00:30:00', '00:15:00', '00:00:00'] },
  { name: 'Total Duration Vendor', values: ['03:30:00', '02:15:00', '01:30:00'] }
];

specificColumns.forEach(column => {
  console.log(`\n📋 ${column.name}:`);
  column.values.forEach(value => {
    const minutes = toMinutes(value);
    console.log(`   "${value}" -> ${minutes} minutes`);
  });
});
