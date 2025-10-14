# MySQL Migration Implementation

## Overview

This document provides the complete implementation of the MySQL migration playbook, including all scripts, configuration files, and execution procedures.

## Files Created

### 1. Migration Scripts

#### `scripts/export-indexeddb-to-json.mjs`
- **Purpose**: Export all data from IndexedDB to JSON files
- **Usage**: `node export-indexeddb-to-json.mjs --out ./export`
- **Features**:
  - Exports tickets, incidents, customers, vendors, uploadSessions
  - Handles Date objects and duration objects
  - Creates export summary with record counts
  - Validates all required files exist

#### `scripts/transform-json-for-mysql.mjs`
- **Purpose**: Transform IndexedDB data to MySQL format
- **Usage**: `node transform-json-for-mysql.mjs --in ./export --out ./stage`
- **Features**:
  - Converts camelCase to snake_case
  - Handles duration objects (rawHours, formatted)
  - Maps field names to MySQL schema
  - Validates transformation results

#### `scripts/validate-parity.mjs`
- **Purpose**: Validate data parity between IndexedDB and MySQL
- **Usage**: `node validate-parity.mjs --src ./export --dst-mysql "mysql://user:pass@host:3306/dbname" --buckets day,cabang --fail-on-mismatch`
- **Features**:
  - Compares record counts and checksums
  - Groups data by buckets (day, cabang, status, category)
  - Validates tickets, incidents, customers
  - Fails on mismatch if specified

#### `scripts/validate-aggregations.mjs`
- **Purpose**: Validate UI aggregations work correctly
- **Usage**: `node validate-aggregations.mjs --mysql "mysql://user:pass@host:3306/dbname" --strict`
- **Features**:
  - Validates ticket aggregations (status, category, cabang, SLA)
  - Validates incident aggregations (status, priority, site, duration)
  - Validates customer aggregations (jenis_klien, layanan, kategori)
  - Validates upload session aggregations
  - Checks data quality and business rules

#### `scripts/feature-flags.mjs`
- **Purpose**: Manage feature flags for migration
- **Usage**: `node feature-flags.mjs --set dataSource=mysql`
- **Features**:
  - Manages dataSource (indexeddb, mysql, dual-read)
  - Manages writeMode (indexeddb-only, mysql-only, dual-write)
  - Manages migrationMode, debugMode, performanceMonitoring
  - Validates flag values and types

#### `scripts/perf-bench.mjs`
- **Purpose**: Performance benchmark for migration
- **Usage**: `node perf-bench.mjs --base-url "https://api.yourapp.local" --token "REDACTED"`
- **Features**:
  - Benchmarks API endpoints (tickets, incidents, customers, vendors, upload-sessions)
  - Benchmarks bulk operations (bulk insert)
  - Monitors memory usage
  - Validates against performance thresholds

#### `scripts/monitor.mjs`
- **Purpose**: Monitor MySQL migration metrics
- **Usage**: `node monitor.mjs --threshold-error 0.01 --threshold-latency-p95 2000`
- **Features**:
  - Monitors API health and performance
  - Monitors database health and performance
  - Monitors connection pool statistics
  - Validates against error and latency thresholds

### 2. Database Schema

#### `sql/schema.mysql.sql`
- **Purpose**: Complete MySQL schema for migration
- **Features**:
  - All tables: tickets, incidents, customers, vendors, upload_sessions, users, menu_permissions
  - Proper indexes for performance
  - Views for common queries
  - Stored procedures for common operations
  - Triggers for audit trail
  - Initial data setup

### 3. Migration Playbook

#### `scripts/migration-playbook.sh`
- **Purpose**: Complete migration execution script
- **Usage**: `./scripts/migration-playbook.sh`
- **Features**:
  - 18-step migration process
  - Pre-flight checks
  - Schema application
  - Data export and transformation
  - Bulk import with chunking
  - Validation and monitoring
  - Feature flag management
  - Rollback procedures

## Migration Process

### Phase 1: Preparation
1. **Pre-flight Checks**: Verify MySQL connection and API availability
2. **Schema Application**: Apply MySQL schema with all tables and indexes
3. **API Smoke Test**: Verify all API endpoints are working

### Phase 2: Data Migration
4. **Export IndexedDB**: Export all data from IndexedDB to JSON files
5. **Transform Data**: Convert IndexedDB format to MySQL format
6. **Create Upload Sessions**: Reconstruct upload session history
7. **Bulk Import**: Import data in chunks via API endpoints

### Phase 3: Validation
8. **Validate Parity**: Compare data between IndexedDB and MySQL
9. **Validate Aggregations**: Ensure UI aggregations work correctly
10. **Performance Benchmark**: Test API performance and bulk operations

### Phase 4: Cutover
11. **Switch Dual Read**: Enable dual-read mode (MySQL primary, IndexedDB fallback)
12. **Switch Dual Write**: Enable dual-write mode (write to both systems)
13. **Performance Test**: Run comprehensive performance tests
14. **Cutover**: Switch to MySQL-only mode
15. **Post-Cutover Monitor**: Monitor system health after cutover

### Phase 5: Finalization
16. **Finalize Upload Sessions**: Mark all upload sessions as completed
17. **Rollback (if needed)**: Revert to IndexedDB if issues detected

## Configuration

### Environment Variables
```bash
# MySQL Configuration
MYSQL_URI="mysql://user:pass@host:3306/dbname"

# API Configuration
BASE_URL="https://api.yourapp.local"
API_TOKEN="REDACTED"

# Migration Configuration
CHUNK_SIZE=200
EXPORT_DIR="./export"
STAGE_DIR="./stage"
RUNTIME_DIR="./runtime"
```

### Feature Flags
```json
{
  "dataSource": "indexeddb|mysql|dual-read",
  "writeMode": "indexeddb-only|mysql-only|dual-write",
  "migrationMode": false,
  "debugMode": false,
  "performanceMonitoring": false,
  "rollbackMode": false
}
```

## Usage

### 1. Prepare Environment
```bash
# Set environment variables
export MYSQL_URI="mysql://user:pass@host:3306/dbname"
export BASE_URL="https://api.yourapp.local"
export API_TOKEN="your-api-token"

# Install dependencies
npm install mysql2 node-fetch jq
```

### 2. Run Migration
```bash
# Make script executable
chmod +x scripts/migration-playbook.sh

# Run complete migration
./scripts/migration-playbook.sh
```

### 3. Monitor Progress
```bash
# Check feature flags
node scripts/feature-flags.mjs --list

# Monitor system health
node scripts/monitor.mjs --threshold-error 0.01 --threshold-latency-p95 2000

# Check performance
node scripts/perf-bench.mjs --base-url "$BASE_URL" --token "$API_TOKEN"
```

### 4. Rollback (if needed)
```bash
# Switch back to IndexedDB
node scripts/feature-flags.mjs --set dataSource=indexeddb --set writeMode=indexeddb-only
```

## Validation

### Data Integrity
- **Record Counts**: All records migrated successfully
- **Checksums**: Data integrity verified with MD5 checksums
- **Buckets**: Data grouped by day, cabang, status, category
- **Relationships**: Foreign key relationships maintained

### Performance
- **API Response Time**: P95 < 2 seconds
- **Bulk Insert Time**: < 5 seconds per chunk
- **Error Rate**: < 1%
- **Memory Usage**: < 100MB

### Business Logic
- **SLA Metrics**: 4h, 8h, 24h SLA calculations
- **Aggregations**: Status, category, cabang breakdowns
- **Upload Sessions**: File tracking and metadata
- **User Permissions**: Role-based access maintained

## Troubleshooting

### Common Issues

#### 1. MySQL Connection Failed
```bash
# Check MySQL service
sudo systemctl status mysql

# Test connection
mysql --connect-timeout=5 "$MYSQL_URI" -e "SELECT 1;"
```

#### 2. API Endpoints Not Responding
```bash
# Check API health
curl -s "$BASE_URL/health"

# Test authentication
curl -s -H "Authorization: Bearer $API_TOKEN" "$BASE_URL/api/tickets?limit=1"
```

#### 3. Data Transformation Errors
```bash
# Check export files
ls -la ./export/

# Validate JSON format
jq '.' ./export/tickets.json | head -10
```

#### 4. Performance Issues
```bash
# Check MySQL performance
mysql "$MYSQL_URI" -e "SHOW PROCESSLIST;"

# Monitor API performance
node scripts/perf-bench.mjs --base-url "$BASE_URL" --token "$API_TOKEN"
```

### Rollback Procedures

#### 1. Immediate Rollback
```bash
# Switch back to IndexedDB
node scripts/feature-flags.mjs --set dataSource=indexeddb --set writeMode=indexeddb-only

# Verify rollback
node scripts/feature-flags.mjs --list
```

#### 2. Data Cleanup
```bash
# Clean up MySQL data (if needed)
mysql "$MYSQL_URI" -e "DELETE FROM tickets WHERE batch_id LIKE 'test-%';"
mysql "$MYSQL_URI" -e "DELETE FROM incidents WHERE batch_id LIKE 'test-%';"
mysql "$MYSQL_URI" -e "DELETE FROM customers WHERE batch_id LIKE 'test-%';"
```

## Success Criteria

### Technical Success
- ✅ All data migrated successfully
- ✅ Data integrity validated
- ✅ Performance benchmarks passed
- ✅ API endpoints responding correctly
- ✅ Database queries optimized

### Business Success
- ✅ UI aggregations working correctly
- ✅ SLA calculations accurate
- ✅ Upload session tracking functional
- ✅ User permissions maintained
- ✅ System stability confirmed

## Next Steps

### Post-Migration
1. **Monitor System**: Continue monitoring for 24-48 hours
2. **Performance Tuning**: Optimize queries and indexes as needed
3. **User Training**: Update documentation and user guides
4. **Backup Strategy**: Implement MySQL backup procedures
5. **Scaling**: Plan for future scaling requirements

### Future Enhancements
1. **Real-time Sync**: Implement real-time data synchronization
2. **Advanced Analytics**: Add more sophisticated reporting
3. **API Versioning**: Implement API versioning strategy
4. **Caching**: Add Redis caching for improved performance
5. **Monitoring**: Implement comprehensive monitoring and alerting

## Conclusion

The MySQL migration implementation provides a complete, production-ready solution for migrating from IndexedDB to MySQL. The playbook includes comprehensive validation, monitoring, and rollback procedures to ensure a safe and successful migration.

All scripts are designed to be idempotent and can be run multiple times safely. The feature flag system allows for gradual rollout and easy rollback if issues are detected.

The migration process is designed to minimize downtime and ensure data integrity throughout the process. Regular monitoring and validation ensure that the migration meets both technical and business requirements.
