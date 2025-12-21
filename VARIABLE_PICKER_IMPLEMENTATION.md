# Variable Reference Picker Implementation

## Overview

This document describes the implementation of the Variable Reference Picker feature for the workflow configuration modal. The feature allows users to easily reference output variables from previous nodes in their workflow configuration without manually typing variable paths.

## Features Implemented

1. **Variable Reference Picker Component** - A modal dialog that displays available variables from previous nodes
2. **Drag-and-Drop Support** - Users can drag variables directly into input fields
3. **Search Functionality** - Filter variables by name, node type, or path
4. **Real Execution Data Integration** - Connects to actual workflow execution data when available
5. **Fallback to Sample Data** - Shows realistic sample data when no execution data is available

## Components

### 1. VariableReferencePicker Component

Located at: `components/workflows/VariableReferencePicker.tsx`

Key features:
- Displays variables grouped by source node
- Shows node icons and types for visual identification
- Provides copy functionality for manual insertion
- Supports drag-and-drop operations
- Searchable variable list
- Responsive design

### 2. NodeConfigModal Integration

Located at: `components/workflows/NodeConfigModal.tsx`

Integration points:
- Added variable picker button to text input fields
- Passes workflow context (nodes, connections, workflowId) to picker
- Handles variable selection and insertion into configuration fields

### 3. API Endpoints

1. **Get Workflow Executions**: `/api/workflows/[workflowId]/executions`
   - Retrieves execution history for a workflow
   - Used to fetch real node output data

2. **Get Workflow Data**: `/api/workflows/[workflowId]`
   - Retrieves workflow structure (nodes and connections)
   - Used for context in variable picker

## Implementation Details

### Variable Extraction Logic

The system extracts variables by:
1. Identifying previous nodes connected to the current node
2. Retrieving execution output data from those nodes
3. Flattening nested objects to extract all possible variable paths
4. Grouping variables by source node for organized display

### Data Flow

```
[Current Node] 
     ↓
Identify incoming connections
     ↓
Retrieve previous node outputs
     ↓
Extract variable paths from outputs
     ↓
Display in VariableReferencePicker
     ↓
User selects/drops variable
     ↓
Insert into configuration field
```

### Drag-and-Drop Implementation

The drag-and-drop functionality is implemented using HTML5 Drag and Drop API:
- Variables can be dragged from the picker
- Input fields accept dropped variables
- Visual feedback during drag operations
- Automatic insertion of variable syntax `{{nodeId.data.field}}`

### Real vs Sample Data

The system prioritizes real execution data:
1. Attempts to fetch latest execution data from API
2. Uses real node outputs when available
3. Falls back to realistic sample data when:
   - No execution data exists
   - API calls fail
   - User hasn't run upstream nodes yet

## Usage

### Opening the Variable Picker

1. Open any node configuration modal
2. Click the `{}` button next to any text input field
3. Browse or search for available variables
4. Click a variable to insert it, or drag it to the desired field

### Supported Node Types

The variable picker works with all node types that produce output data:
- HTTP Request nodes
- String Manipulation nodes
- Number Formatter nodes
- Date Formatter nodes
- Variable Setter nodes
- Logger nodes
- And any other nodes that produce structured output

## Testing

A test implementation is available at `test_variable_picker.tsx` which demonstrates:
- Basic variable picker functionality
- Mock workflow data
- Integration with input fields
- Drag-and-drop operations

## Future Enhancements

Potential improvements:
1. **Enhanced Search**: Fuzzy search, categorization filters
2. **Preview Panel**: Show sample values for selected variables
3. **Recent Variables**: Quick access to recently used variables
4. **Favorites**: Allow users to bookmark frequently used variables
5. **Type Information**: Display data types for variables
6. **Validation**: Warn users about incompatible variable types

## API Requirements

The implementation requires the following API endpoints:
1. `GET /api/workflows/[workflowId]` - Get workflow structure
2. `GET /api/workflows/[workflowId]/executions` - Get execution history

These endpoints should return data in the standard workflow execution format with node logs containing output data.

## Styling

The component uses Tailwind CSS classes and follows the existing design system:
- Dark theme with zinc color palette
- Consistent spacing and typography
- Interactive states (hover, focus, active)
- Responsive layout for different screen sizes

## Error Handling

The implementation gracefully handles:
- Network errors when fetching execution data
- Missing workflow data
- Malformed execution logs
- Unavailable API endpoints
- Fallback to sample data in all error cases

## Performance Considerations

- Efficient variable path extraction using recursive algorithms
- Memoized computations to prevent unnecessary re-renders
- Lazy loading of variable data
- Optimized search filtering
- Minimal DOM updates during drag operations