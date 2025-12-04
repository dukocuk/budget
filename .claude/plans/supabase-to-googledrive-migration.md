# Supabase to Google Drive Migration Plan

## Executive Summary

Comprehensive migration plan to replace Supabase with Google Drive as cloud storage backend for the budget tracker app. The migration maintains the local-first architecture with PGlite while switching cloud sync from Supabase PostgreSQL to a single JSON file in Google Drive.

---

## 1. Google Drive Integration Architecture

### 1.1 OAuth & API Setup

**Scope Requirements**:
- `https://www.googleapis.com/auth/drive.file` - Access only to files created by the app
- `https://www.googleapis.com/auth/userinfo.profile` - User profile info (already via Google OAuth)
- `https://www.googleapis.com/auth/userinfo.email` - User email (already via Google OAuth)

**Why `drive.file` over `drive.appdata`**:
- `drive.file`: User-visible folder "BudgetTracker/" - allows manual backup access
- `drive.appdata`: Hidden folder - no user access, isolated per app
- Recommendation: Use `drive.file` for transparency and user control

**Dependencies**:
```json
{
  "dependencies": {
    "@react-oauth/google": "^0.12.1",
    "gapi-script": "^1.2.0"
  }
}
```

### 1.2 File Structure in Google Drive

**Location**: `/BudgetTracker/budget-data.json`

**Single JSON Schema**:
```json
{
  "version": "1.0",
  "userId": "user-google-id",
  "lastModified": "2025-12-03T10:30:00Z",
  "expenses": [
    {
      "id": "uuid",
      "userId": "user-id",
      "name": "Netflix",
      "amount": 79,
      "frequency": "monthly",
      "startMonth": 1,
      "endMonth": 12,
      "budgetPeriodId": "period-uuid",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "budgetPeriods": [
    {
      "id": "uuid",
      "userId": "user-id",
      "year": 2025,
      "monthlyPayment": 5700,
      "previousBalance": 4831,
      "monthlyPayments": null,
      "status": "active",
      "isTemplate": 0,
      "templateName": null,
      "templateDescription": null,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Version Field**: Future-proof for schema migrations
**lastModified**: Used for conflict resolution (last-write-wins)

---

## 2. Migration Strategy

### Phase 1: Foundation Setup (No Breaking Changes)
**Goal**: Add Google Drive client alongside Supabase

#### 2.1 Install Dependencies
```bash
npm install @react-oauth/google gapi-script
```

#### 2.2 Create Google Drive Library

**New File**: `src/lib/googleDrive.js`

Key functions:
- `initGoogleDrive()`: Initialize Google API client
- `getOrCreateFolder()`: Find/create BudgetTracker folder
- `loadFromDrive()`: Download JSON file
- `saveToDrive(data, fileId)`: Upload/update JSON file

#### 2.3 Update Environment Variables

**File**: `.env.example`
```env
# Google OAuth & Drive
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key

# Supabase (DEPRECATED - will be removed in Phase 3)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
```

---

### Phase 2: Authentication Migration

#### 2.1 Replace `useAuth.js`

**File**: `src/hooks/useAuth.js`

**Strategy**: Replace Supabase Auth with Google Identity Services

Key changes:
- Remove `supabase.auth` dependency
- Use Google Identity Services directly
- Store user session in localStorage
- Implement JWT token decoding

---

### Phase 3: Sync Architecture Migration

#### 3.1 Replace `SyncContext.jsx`

**File**: `src/contexts/SyncContext.jsx`

**Strategy**: Replace Supabase operations with Google Drive operations

Key functions to replace:
- `syncExpenses()` → `syncToDrive()` (single unified sync)
- `syncBudgetPeriods()` → `syncToDrive()` (same function)
- `loadExpenses()` → `loadFromDriveToLocal()`
- `loadBudgetPeriods()` → `loadFromDriveToLocal()` (same function)

**New approach**:
- Single sync operation for all data (not separate tables)
- Load entire JSON file, merge with PGlite
- Debounced writes (1 second delay, same as current)

---

### Phase 4: Polling Strategy for Multi-Device Sync

**Challenge**: Google Drive doesn't have real-time subscriptions like Supabase

**Solution**: Polling with smart intervals

Add to SyncContext:
```javascript
useEffect(() => {
  let pollInterval = setInterval(async () => {
    const driveData = await loadFromDrive();
    const cloudModified = new Date(driveData.lastModified);
    const localModified = new Date(lastSyncTimeRef.current || 0);

    if (cloudModified > localModified) {
      await loadFromDriveToLocal();
    }
  }, 30000); // 30 seconds

  return () => clearInterval(pollInterval);
}, [user, isOnline]);
```

**Optimizations**:
- Exponential backoff on errors
- Pause polling when tab is inactive
- Adaptive intervals (active: 30s, idle: 5 min)

---

### Phase 5: Migration & Cleanup

#### 5.1 Data Migration Script

**New File**: `src/utils/migrateSupabaseToDrive.js`

One-time migration:
1. Fetch all data from Supabase
2. Transform to Drive JSON format
3. Upload to Google Drive
4. Mark migration complete in localStorage

#### 5.2 Files to Delete

After verification:
1. `src/lib/supabase.js`
2. `src/contexts/SyncContext.test.jsx` (rewrite for Drive)
3. `.github/workflows/keep-supabase-alive.yml`
4. Environment variables: `VITE_SUPABASE_*`

---

## 3. Testing Strategy

### 3.1 Pre-Migration Testing
- Test Google Drive folder creation
- Test file upload/download
- Verify JSON format integrity

### 3.2 Parallel Testing
- Run both Supabase AND Drive sync
- Compare data integrity
- Validate conflict resolution

### 3.3 Migration Testing
- Run migration script on test account
- Verify all data transferred
- Test multi-device sync (30s delay)
- Test offline/online transitions

---

## 4. Error Handling

### 4.1 Google Drive Errors

**Quota Exceeded** (15 GB free tier):
```javascript
if (error.code === 403 && error.message.includes('quota')) {
  updateSyncError('Google Drive storage quota exceeded');
}
```

**Network Timeout**:
```javascript
const TIMEOUT_MS = 30000;
Promise.race([
  syncToDrive(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
]);
```

**Permission Denied**:
```javascript
if (error.code === 403) {
  // Trigger re-authentication
  await getAccessToken();
}
```

### 4.2 Conflict Resolution

**Strategy**: Last-write-wins based on `lastModified` timestamp

```javascript
const localTime = new Date(localData.lastModified || 0);
const cloudTime = new Date(cloudData.lastModified || 0);

if (cloudTime > localTime) {
  return cloudData; // Cloud is newer
} else {
  return localData; // Local is newer
}
```

---

## 5. Performance Considerations

### 5.1 File Size Limits

**Current Data Size**: ~22 KB (100 expenses + 5 budget periods)
**Google Drive Limits**: 5 TB per file, 1000 requests/100s

**Optimization**: Add compression for large datasets (>100 KB)

### 5.2 Sync Performance Comparison

| Operation | Supabase | Google Drive |
|-----------|----------|--------------|
| Initial load | ~200ms | ~500ms |
| Sync write | ~150ms | ~400ms |
| Real-time | Instant | 30s polling |
| Offline | Full | Full |

**Trade-offs**: Slightly slower sync, acceptable for budget app use case

---

## 6. Rollback Plan

### 6.1 Emergency Rollback

If migration fails:
1. `git revert <migration-commit>`
2. Supabase data unchanged (read-only during migration)
3. Local PGlite data intact
4. Resume Supabase sync

### 6.2 Partial Rollback

If only auth fails:
- Keep Drive sync
- Restore Supabase Auth temporarily
- Fix auth, migrate later

---

## 7. Implementation Timeline

### Week 1: Foundation (Phase 1)
- Days 1-2: Setup Google Drive API, create `googleDrive.js`
- Days 3-4: Test folder/file operations
- Day 5: Environment setup

### Week 2: Auth Migration (Phase 2)
- Days 1-2: Replace `useAuth.js`
- Days 3-4: Test authentication flow
- Day 5: Buffer/testing

### Week 3: Sync Migration (Phase 3-4)
- Days 1-3: Replace `SyncContext.jsx`
- Day 4: Add polling
- Day 5: Conflict resolution testing

### Week 4: Testing & Deployment (Phase 5)
- Days 1-2: Parallel testing
- Day 3: Data migration
- Days 4-5: Production deployment

**Total**: 3-4 weeks

---

## 8. Critical Files for Implementation

### Most Critical (5 files)

1. **`src/lib/googleDrive.js`** (NEW)
   - **Reason**: Core Google Drive client - all API interactions
   - **Complexity**: High - OAuth, file management, error handling

2. **`src/contexts/SyncContext.jsx`** (REPLACE)
   - **Reason**: Central sync hub - all sync operations
   - **Complexity**: High - State management, debouncing, polling

3. **`src/hooks/useAuth.js`** (REPLACE)
   - **Reason**: Google OAuth integration, session management
   - **Complexity**: Medium - OAuth flow, token handling

4. **`src/utils/migrateSupabaseToDrive.js`** (NEW)
   - **Reason**: One-time data migration from Supabase
   - **Complexity**: Medium - Data transformation, validation

5. **`src/hooks/useSettings.js`** (MODIFY)
   - **Reason**: Remove direct Supabase call (line 141), use SyncContext
   - **Complexity**: Low - Single line change

---

## 9. Potential Pitfalls & Solutions

### 9.1 OAuth Redirect Issues
**Problem**: Redirect fails in development
**Solution**: Configure redirect URIs in Google Cloud Console
```
http://localhost:5173
https://your-domain.com
```

### 9.2 CORS Errors
**Problem**: Drive API blocked by CORS
**Solution**: Use `gapi.client` (handles CORS), not `fetch`

### 9.3 Token Expiration
**Problem**: Access token expires, sync fails
**Solution**: Implement token refresh before each operation

### 9.4 File ID Loss
**Problem**: File ID lost on refresh, creates duplicates
**Solution**: Store file ID in localStorage

### 9.5 Sync Loop
**Problem**: Sync triggers infinite loop
**Solution**: Use `isSyncingRef` flag (already implemented)

---

## 10. Post-Migration Monitoring

### Key Metrics (track for 2 weeks)
- Sync success rate (target: >99%)
- Average sync latency (target: <1 second)
- Error rate (target: <0.1%)
- Multi-device sync delay (target: <60 seconds)
- User reports of data loss (target: 0)

### Logging Strategy
```javascript
logSyncMetrics(operation, duration, success) {
  // Send to monitoring service (LogRocket, Sentry, etc.)
}
```

---

## 11. Documentation Updates

### 11.1 Update CLAUDE.md
Section: "Data Architecture"
- Update cloud sync description
- Replace Supabase references with Google Drive
- Document polling strategy

### 11.2 Update README
Add section: "Google Drive Setup"
- Enable Drive API in Google Cloud Console
- Create OAuth credentials
- Configure redirect URIs
- Copy credentials to `.env`

---

## Summary

This migration plan provides a comprehensive, phased approach:

✅ **Local-first preserved**: PGlite remains primary storage
✅ **Simplified cloud**: Single JSON file vs database
✅ **User transparency**: Data visible in Google Drive
✅ **Backwards compatible**: Seamless data migration
✅ **No data loss**: Supabase + PGlite both preserved
✅ **Rollback-ready**: Can revert if needed

**Benefits**:
- No Supabase costs
- Simplified architecture
- User-visible backups
- Full offline support maintained

**Risk Level**: Medium (mitigated by extensive testing)
**Timeline**: 3-4 weeks
**Effort**: ~80-100 hours development + testing
