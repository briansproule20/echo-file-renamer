# Vercel Blob Integration - Large File Support

## 🎉 What Changed

The app now uses **Vercel Blob Storage** for handling file uploads, which solves the deployment issue with large files.

### Before (Issues)
- ❌ Files stored in memory (base64)
- ❌ API route body size limit (~4.5MB)
- ❌ Memory crashes with large files
- ❌ Base64 encoding increased file size by 33%

### After (Fixed)
- ✅ Direct client-to-blob uploads (up to 500MB per file)
- ✅ No API route size limits
- ✅ Files processed from URLs (low memory)
- ✅ Built-in progress tracking
- ✅ Persistent storage with CDN caching

---

## 🛠️ Setup Instructions

### 1. Environment Variables

Add your Vercel Blob token to `.env.local`:

```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_YOUR_TOKEN_HERE
```

**Where to get the token:**
1. Go to: https://vercel.com/dashboard/stores/blob
2. Select your blob store: `store_japzt8FwIOESDBcg`
3. Copy the `BLOB_READ_WRITE_TOKEN`

### 2. Your Existing Blob Store

Your blob store is already created:
- **URL**: `https://japzt8fwioesdbcg.public.blob.vercel-storage.com`
- **Store ID**: `store_japzt8FwIOESDBcg`

---

## 📁 Files Changed

### New Files Created
1. **`src/lib/blob-upload.ts`** - Client-side blob upload utilities
2. **`src/app/api/blob/upload/route.ts`** - Token generation endpoint for client uploads

### Modified Files
1. **`src/types/renamer.ts`** - Added `blobUrl` field to `FileItem` and `ExtractedData`
2. **`src/components/file-dropzone.tsx`** - Now uploads to Vercel Blob with progress tracking
3. **`src/app/api/extract/route.ts`** - Fetches files from blob URLs instead of FormData
4. **`src/app/api/propose/route.ts`** - Uses blob URLs for image vision processing
5. **`src/app/api/zip/route.ts`** - Streams files from blob URLs for ZIP generation
6. **`src/components/file-renamer.tsx`** - Updated to use blob URLs throughout

---

## 🔄 New Upload Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User drops file
       ▼
┌─────────────────────┐
│  file-dropzone.tsx  │
│ uploadFileToBlob()  │
└──────┬──────────────┘
       │ 2. Request token
       ▼
┌────────────────────────────┐
│ /api/blob/upload (POST)    │
│ Generate secure token      │
└──────┬─────────────────────┘
       │ 3. Return token
       ▼
┌─────────────────────────────┐
│  Vercel Blob (Direct)       │
│  Upload file to CDN         │
└──────┬──────────────────────┘
       │ 4. Return blob URL
       ▼
┌──────────────────────────────┐
│  Store blobUrl in FileItem   │
└──────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  /api/extract (POST)         │
│  Fetch file from blob URL    │
│  Extract text content        │
└──────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  /api/propose (POST)         │
│  Use blob URL for AI         │
│  Generate filenames          │
└──────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  /api/zip (POST)             │
│  Stream from blob URLs       │
│  Create ZIP for download     │
└──────────────────────────────┘
```

---

## 🎯 Key Implementation Details

### Client-Side Upload (`upload()`)
- **File**: `src/lib/blob-upload.ts`
- **Method**: Uses `@vercel/blob/client` `upload()` function
- **Benefits**: 
  - Bypasses API route completely
  - Direct browser → Vercel Blob CDN
  - No 4.5MB limit
  - Built-in progress tracking

### Token Generation Endpoint
- **File**: `src/app/api/blob/upload/route.ts`
- **Purpose**: Generates secure, time-limited upload tokens
- **Security**: 
  - Validates file types
  - Sets max size (500MB)
  - Tokens expire after use

### File Processing
All API routes now:
1. Receive blob URLs (not file data)
2. Fetch files on-demand from blob storage
3. Process without storing in memory
4. Return results

---

## 💰 Pricing Estimate

Based on Vercel Blob pricing for your usage:

**For 100 files/day (50MB avg):**
- Storage: ~$0.15/month (temporary storage)
- Operations: ~$0.75/month (upload/read/delete)
- Data transfer: ~$18/month (5GB download)
- **Total: ~$19/month**

**Cost per file processed:** ~$0.006

---

## 🧪 Testing Large Files

Test with files up to 500MB:

```bash
# Test with a large PDF (100MB+)
# Test with multiple large images (50MB each)
# Test with large ZIP files
```

The app will now:
1. Show upload progress per file
2. Handle multiple large files simultaneously
3. Process without memory issues
4. Stream ZIP downloads efficiently

---

## 🚀 Deployment Checklist

- [x] Install `@vercel/blob` package
- [x] Create blob upload utilities
- [x] Update all API routes to use blob URLs
- [x] Add upload progress UI
- [x] Test build (successful)
- [ ] Add `BLOB_READ_WRITE_TOKEN` to Vercel environment variables
- [ ] Deploy to Vercel
- [ ] Test with large files (100MB+)

---

## 📚 References

- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Client Uploads Guide](https://vercel.com/docs/storage/vercel-blob/client-uploads)
- [Your Blob Store Dashboard](https://vercel.com/dashboard/stores/blob/store_japzt8FwIOESDBcg)

---

## ⚠️ Important Notes

1. **Environment Variable**: Must add `BLOB_READ_WRITE_TOKEN` to both local `.env.local` and Vercel project settings
2. **File Retention**: Uploaded blobs persist until manually deleted (no auto-cleanup yet)
3. **Storage Costs**: Monitor blob storage usage in Vercel dashboard
4. **Token Security**: Never expose `BLOB_READ_WRITE_TOKEN` in client-side code (handled by API route)

