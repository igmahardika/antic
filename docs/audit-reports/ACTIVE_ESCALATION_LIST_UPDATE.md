# Active Escalation List Update

## Overview
Modified the active escalation list to display only essential information: Customer, Problem, Created Date, and Active Duration, providing a cleaner and more focused view for active escalations.

## Changes Made

### 1. EscalationTable.tsx
- **Added duration calculation utility**: Created `calculateActiveDuration()` function to calculate time elapsed since escalation creation
- **Modified table headers**: Different column structure for active vs closed escalations
- **Updated row display**: Conditional rendering based on escalation mode
- **Enhanced duration display**: Shows duration with clock icon and formatted time

### 2. Active Escalation List Structure
**Columns for Active Escalations:**
- **Customer**: Customer name
- **Problem**: Problem description (as input)
- **Created**: Creation date
- **Durasi Active**: Active duration with clock icon
- **Action**: Edit and Close buttons

**Columns for Closed Escalations (unchanged):**
- **Customer**: Customer name
- **Problem**: Problem description
- **Action**: Action taken
- **Rekomendasi**: Recommendation
- **Code**: Escalation code
- **Created**: Creation date
- **Updated**: Last update date
- **Action**: Edit button only

## Key Features

### Duration Calculation
- **Real-time calculation**: Shows current active duration
- **Formatted display**: Shows days, hours, and minutes in Indonesian
- **Visual indicator**: Clock icon with orange color
- **Dynamic updates**: Duration updates automatically

### Duration Format Examples
- **Less than 1 hour**: "45 menit"
- **1-24 hours**: "3 jam 15 menit"
- **More than 1 day**: "2 hari 5 jam"

### Visual Design
- **Active duration**: Orange clock icon with formatted time
- **Clean layout**: Simplified columns for better focus
- **Responsive design**: Maintains table responsiveness
- **Consistent styling**: Matches existing design patterns

## Benefits
- **Focused view**: Shows only essential information for active escalations
- **Quick assessment**: Easy to see how long escalations have been active
- **Better UX**: Cleaner interface for active escalation management
- **Time awareness**: Visual indication of escalation age
- **Maintained functionality**: All existing features preserved

## Usage
1. **Active Tab**: Shows simplified view with duration
2. **Closed Tab**: Shows full details as before
3. **Duration tracking**: Automatically calculates and displays active time
4. **Action buttons**: Edit and Close available for active escalations

The active escalation list now provides a streamlined view focused on the most important information for managing ongoing escalations, while maintaining full functionality for closed escalations.
