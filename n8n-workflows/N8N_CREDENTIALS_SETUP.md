# n8n Credentials Setup Guide

## Overview

The Octo Movie Generation workflow uses these credentials:

| Service | Credential Type | Status |
|---------|----------------|--------|
| PostgreSQL (Neon) | Postgres Credential | **Must Create** |
| Azure GPT-4o | Header Auth (embedded) | Already in workflow |
| Azure Sora 2 | Header Auth (embedded) | Already in workflow |
| Azure Speech TTS | Header Auth (embedded) | Already in workflow |
| Appwrite Storage | Header Auth (embedded) | Already in workflow |

## Step 1: PostgreSQL Credential (Required)

You've already done this! The credential name should be: **Octo Neon Database**

Connection details:
- Host: `ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech`
- Database: `neondb`
- User: `neondb_owner`
- Password: `npg_HzwxYc0l7bUG`
- Port: `5432`
- SSL: **Enabled**

---

## Step 2: About Header Auth Credentials

**IMPORTANT:** You do NOT need to create separate Header Auth credentials!

The workflow has API keys embedded directly in HTTP Request nodes:

### GPT-4o Script Analyzer Node
- The `api-key` header is already set in the node's header parameters
- Value: `9zMZdd9AnkTcDvxT6MnDYfPopybq0Pydkwv6ihDRURqUTwWC5QlMJQQJ99BIACYeBjFXJ3w3AAAAACOGUgI4`

### Sora 2 Nodes (Create Video & Check Status)
- The `api-key` header is already set
- Value: `FpyNVx3HU6qv92ZTypcSBI250cmgYcRT8wPglshXt5plqnuz8Z4NJQQJ99BJACHYHv6XJ3w3AAAAACOGSaAO`

### Azure Speech TTS Node
- The `Ocp-Apim-Subscription-Key` header is already set
- Value: `9zMZdd9AnkTcDvxT6MnDYfPopybq0Pydkwv6ihDRURqUTwWC5QlMJQQJ99BIACYeBjFXJ3w3AAAAACOGUgI4`

### Appwrite Storage Nodes
- The `X-Appwrite-Project` and `X-Appwrite-Key` headers are already set

---

## Step 3: If n8n Asks for Header Auth Credential

If any HTTP Request node shows a warning about "Credential to connect with", you have two options:

### Option A: Ignore It (Recommended)
The API keys are already in the header parameters, so credentials aren't needed. The warning can be ignored.

### Option B: Create a Dummy Credential
If you want to suppress the warning:

1. Go to **Settings** > **Credentials** > **Add Credential**
2. Search for **Header Auth**
3. Configure:
   - Name: `Azure API Key` (or any name)
   - Header Name: `x-dummy`
   - Header Value: `not-used`
4. Save and select this credential in the node

The workflow will still use the embedded API keys from the header parameters.

---

## Step 4: Link PostgreSQL Credential to All Postgres Nodes

After importing the workflow, you need to connect the PostgreSQL credential to each database node:

1. Open the workflow in n8n
2. Click on each **Postgres** node (there are 7 of them):
   - Create Job Record
   - Save Scene to DB
   - Update Scene with Sora Job
   - Update Scene Complete
   - Update Movie Progress
   - Update Movie Complete
   - Update Scene Failed

3. For each node:
   - Click on the node to open settings
   - Find **Credential to connect with**
   - Select **Octo Neon Database**
   - Click outside to save

---

## Step 5: Verify the Workflow

1. Click **Test workflow** or trigger manually
2. Check execution logs for any credential errors
3. If all nodes have green checkmarks, you're good!

---

## Troubleshooting

### "No credential selected" error on Postgres nodes
- Link the **Octo Neon Database** credential to each Postgres node

### "Authentication failed" on HTTP Request nodes
- The API keys are embedded - check if they're still valid
- Azure keys may have expired if you regenerated them

### "Connection refused" on Postgres
- Ensure SSL is enabled in the credential
- Neon databases sleep after 5 min - retry once

---

## Quick Reference: All Nodes Requiring Credentials

| Node Name | Credential Type | What to Select |
|-----------|----------------|----------------|
| Create Job Record | Postgres | Octo Neon Database |
| Save Scene to DB | Postgres | Octo Neon Database |
| Update Scene with Sora Job | Postgres | Octo Neon Database |
| Update Scene Complete | Postgres | Octo Neon Database |
| Update Movie Progress | Postgres | Octo Neon Database |
| Update Movie Complete | Postgres | Octo Neon Database |
| Update Scene Failed | Postgres | Octo Neon Database |
| GPT-4o Script Analyzer | Header Auth | (embedded - not needed) |
| Sora 2 - Create Video Job | Header Auth | (embedded - not needed) |
| Sora 2 - Check Status | Header Auth | (embedded - not needed) |
| Azure TTS | Header Auth | (embedded - not needed) |
| Upload to Appwrite | Header Auth | (embedded - not needed) |
