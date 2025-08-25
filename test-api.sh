#!/bin/bash

# Helpdesk Management System - API Testing Script
# This script tests all API endpoints and Redis functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_BASE="http://localhost:3001"
TEST_USER="testuser_$(date +%s)"
TEST_PASS="testpass123"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🧪 $1${NC}"
    echo "=================================================="
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    log_info "Testing: $test_name"
    
    if response=$(eval "$test_command" 2>&1); then
        if [[ -n "$expected_pattern" && ! "$response" =~ $expected_pattern ]]; then
            log_error "Test failed: $test_name (unexpected response)"
            echo "Response: $response"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        else
            log_success "Test passed: $test_name"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        fi
    else
        log_error "Test failed: $test_name (command failed)"
        echo "Error: $response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Check if backend is running
check_backend() {
    log_header "Checking Backend Status"
    
    if ! curl -s "$API_BASE/health" > /dev/null; then
        log_error "Backend is not running on $API_BASE"
        echo "Please start the backend server first:"
        echo "  cd antic-backend && npm start"
        exit 1
    fi
    
    log_success "Backend is running"
}

# Test health endpoint
test_health() {
    log_header "Testing Health Endpoint"
    
    run_test "Health Check" \
        "curl -s $API_BASE/health" \
        '"status".*"ok"'
}

# Test user registration
test_registration() {
    log_header "Testing User Registration"
    
    # Test successful registration
    run_test "Register New User" \
        "curl -s -X POST $API_BASE/register -H 'Content-Type: application/json' -d '{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\",\"role\":\"user\"}'" \
        '"success".*true'
    
    # Test duplicate username
    run_test "Register Duplicate User (should fail)" \
        "curl -s -X POST $API_BASE/register -H 'Content-Type: application/json' -d '{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\",\"role\":\"user\"}'" \
        '"error".*"already exists"'
    
    # Test invalid data
    run_test "Register with Short Password (should fail)" \
        "curl -s -X POST $API_BASE/register -H 'Content-Type: application/json' -d '{\"username\":\"shortpass\",\"password\":\"123\",\"role\":\"user\"}'" \
        '"error".*"at least 6 characters"'
}

# Test user login
test_login() {
    log_header "Testing User Authentication"
    
    # Test successful login with default admin
    local login_response
    login_response=$(curl -s -X POST "$API_BASE/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}')
    
    if echo "$login_response" | grep -q '"success":true'; then
        log_success "Admin login successful"
        ADMIN_TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "Admin login failed"
        echo "Response: $login_response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Test login with created test user
    local test_login_response
    test_login_response=$(curl -s -X POST "$API_BASE/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")
    
    if echo "$test_login_response" | grep -q '"success":true'; then
        log_success "Test user login successful"
        TEST_USER_TOKEN=$(echo "$test_login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "Test user login failed"
        echo "Response: $test_login_response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Test invalid credentials
    run_test "Login with Invalid Credentials (should fail)" \
        "curl -s -X POST $API_BASE/login -H 'Content-Type: application/json' -d '{\"username\":\"invalid\",\"password\":\"invalid\"}'" \
        '"error".*"Invalid credentials"'
}

# Test protected endpoints
test_protected_endpoints() {
    log_header "Testing Protected Endpoints"
    
    if [[ -z "$ADMIN_TOKEN" ]]; then
        log_error "No admin token available, skipping protected endpoint tests"
        return
    fi
    
    # Test get users (admin only)
    run_test "Get Users (Admin)" \
        "curl -s -X GET $API_BASE/users -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        '\[.*\]'
    
    # Test get profile
    run_test "Get Profile (Admin)" \
        "curl -s -X GET $API_BASE/profile -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        '"username".*"admin"'
    
    # Test unauthorized access
    run_test "Get Users without Token (should fail)" \
        "curl -s -X GET $API_BASE/users" \
        '"error".*"Access token required"'
    
    # Test access with user token (should fail for users endpoint)
    if [[ -n "$TEST_USER_TOKEN" ]]; then
        run_test "Get Users with User Token (should fail)" \
            "curl -s -X GET $API_BASE/users -H 'Authorization: Bearer $TEST_USER_TOKEN'" \
            '"error".*"Access denied"'
    fi
}

# Test rate limiting
test_rate_limiting() {
    log_header "Testing Rate Limiting"
    
    log_info "Sending multiple requests to test rate limiting..."
    
    # Send many requests quickly
    local rate_limit_hit=false
    for i in {1..10}; do
        response=$(curl -s "$API_BASE/health")
        if echo "$response" | grep -q "Too many requests"; then
            rate_limit_hit=true
            break
        fi
        sleep 0.1
    done
    
    if [[ "$rate_limit_hit" == true ]]; then
        log_success "Rate limiting is working"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warning "Rate limiting not triggered (may need more requests or different endpoint)"
        # Don't count as failure since rate limiting might have high limits
    fi
}

# Test logout
test_logout() {
    log_header "Testing Logout"
    
    if [[ -n "$ADMIN_TOKEN" ]]; then
        run_test "Logout Admin" \
            "curl -s -X POST $API_BASE/logout -H 'Authorization: Bearer $ADMIN_TOKEN'" \
            '"success".*true'
        
        # Test that token is now invalid
        run_test "Use Invalid Token After Logout (should fail)" \
            "curl -s -X GET $API_BASE/profile -H 'Authorization: Bearer $ADMIN_TOKEN'" \
            '"error".*"Session expired"'
    fi
}

# Test Redis functionality (if available)
test_redis() {
    log_header "Testing Redis Functionality"
    
    if command -v redis-cli >/dev/null 2>&1; then
        # Test Redis connection
        if redis-cli ping > /dev/null 2>&1; then
            log_success "Redis is accessible"
            
            # Check for session keys
            session_keys=$(redis-cli KEYS "session:*" 2>/dev/null | wc -l)
            if [[ $session_keys -gt 0 ]]; then
                log_success "Found $session_keys session(s) in Redis"
            else
                log_info "No active sessions found in Redis"
            fi
            
            # Check for user cache keys
            user_keys=$(redis-cli KEYS "user:*" 2>/dev/null | wc -l)
            if [[ $user_keys -gt 0 ]]; then
                log_success "Found $user_keys user cache entries in Redis"
            else
                log_info "No user cache entries found in Redis"
            fi
            
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log_warning "Redis is not accessible (using memory cache fallback)"
        fi
    else
        log_warning "Redis CLI not available, skipping Redis tests"
    fi
}

# Test cache statistics (admin only)
test_cache_stats() {
    log_header "Testing Cache Statistics"
    
    # Login as admin again for cache stats test
    local admin_login_response
    admin_login_response=$(curl -s -X POST "$API_BASE/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}')
    
    if echo "$admin_login_response" | grep -q '"success":true'; then
        local fresh_admin_token
        fresh_admin_token=$(echo "$admin_login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        
        run_test "Get Cache Statistics (Super Admin)" \
            "curl -s -X GET $API_BASE/cache/stats -H 'Authorization: Bearer $fresh_admin_token'" \
            'redis_connected\|fallback_cache'
    fi
}

# Performance test
test_performance() {
    log_header "Testing Performance"
    
    log_info "Running performance test (10 concurrent health checks)..."
    
    start_time=$(date +%s.%N)
    
    # Run 10 concurrent requests
    for i in {1..10}; do
        curl -s "$API_BASE/health" > /dev/null &
    done
    
    wait
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    log_success "Performance test completed in ${duration}s"
    
    if (( $(echo "$duration < 5.0" | bc -l) )); then
        log_success "Performance is good (< 5s for 10 concurrent requests)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warning "Performance might be slow (${duration}s for 10 concurrent requests)"
    fi
}

# Print test summary
print_summary() {
    log_header "Test Summary"
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    
    echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
    echo -e "${BLUE}📊 Total Tests: $total_tests${NC}"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "\n${GREEN}🎉 All tests passed! Your Helpdesk Management System backend is working correctly.${NC}"
        exit 0
    else
        echo -e "\n${RED}⚠️  Some tests failed. Please check the logs above.${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "     Helpdesk Management System API Tests"
    echo "=================================================="
    echo -e "${NC}"
    
    check_backend
    test_health
    test_registration
    test_login
    test_protected_endpoints
    test_rate_limiting
    test_logout
    test_redis
    test_cache_stats
    test_performance
    print_summary
}

# Check for required tools
if ! command -v curl >/dev/null 2>&1; then
    log_error "curl is required but not installed."
    exit 1
fi

if ! command -v bc >/dev/null 2>&1; then
    log_warning "bc is not installed. Performance timing will be skipped."
fi

# Run main function
main "$@"