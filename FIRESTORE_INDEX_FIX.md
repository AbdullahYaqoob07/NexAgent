# Firestore Index Fix

## Issue
```
The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/nexagent-90391/firestore/indexes?create_composite=...
```

## Solution

### Option 1: Click the Link (Easiest)
1. Click the URL in the error message
2. Firebase Console will open with the index pre-configured
3. Click "Create Index"
4. Wait 2-5 minutes for the index to build
5. Refresh your app

### Option 2: Manual Index Creation
1. Go to Firebase Console: https://console.firebase.google.com/project/nexagent-90391/firestore/indexes
2. Click "Add Index"
3. Configure:
   - **Collection ID**: `nodeDefinitions`
   - **Fields**:
     - `isActive` - Ascending
     - `name` - Ascending
     - `__name__` - Ascending
   - **Query scope**: Collection
4. Click "Create"
5. Wait for the index to build

### Option 3: Use firestore.indexes.json
Create or update `firestore.indexes.json` in your project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "nodeDefinitions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "__name__",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy with Firebase CLI:
```bash
firebase deploy --only firestore:indexes
```

## Why This Happens

Firestore requires indexes for compound queries (queries with multiple `where`, `orderBy` clauses). Your query is:

```typescript
// Querying nodeDefinitions with:
// - where isActive = true
// - orderBy name
```

This requires a composite index on `(isActive, name)`.

## Temporary Workaround (Development Only)

While the index is building, you can modify the query in `app/api/admin/nodes/route.ts`:

### Option A: Remove the filter
```typescript
// Instead of:
const snapshot = await admin.firestore()
  .collection('nodeDefinitions')
  .where('isActive', '==', true)
  .orderBy('name')
  .get();

// Use:
const snapshot = await admin.firestore()
  .collection('nodeDefinitions')
  .orderBy('name')
  .get();

// Then filter in code:
const nodes = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(node => node.isActive !== false);
```

### Option B: Remove the orderBy
```typescript
// Instead of:
const snapshot = await admin.firestore()
  .collection('nodeDefinitions')
  .where('isActive', '==', true)
  .orderBy('name')
  .get();

// Use:
const snapshot = await admin.firestore()
  .collection('nodeDefinitions')
  .where('isActive', '==', true)
  .get();

// Then sort in code:
const nodes = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .sort((a, b) => a.name.localeCompare(b.name));
```

## Best Practice

For production, always create the required indexes. The temporary workarounds above work but are less efficient for large datasets.

## Common Firestore Indexes You'll Need

Here's a complete `firestore.indexes.json` for your project:

```json
{
  "indexes": [
    {
      "collectionGroup": "nodeDefinitions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "nodeDefinitions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "workflows",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "workflowExecutions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workflowId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy all indexes at once:
```bash
firebase deploy --only firestore:indexes
```

## Status Check

After creating the index, check its status:
1. Go to Firebase Console → Firestore → Indexes
2. Look for "Building" or "Enabled" status
3. Building typically takes 2-5 minutes
4. Once "Enabled", refresh your app

## Summary

✅ **Quick Fix**: Click the error link and create the index  
⏱️ **Wait Time**: 2-5 minutes for index to build  
🔄 **Alternative**: Use temporary workaround while waiting  
📦 **Best Practice**: Deploy `firestore.indexes.json` for all indexes  
