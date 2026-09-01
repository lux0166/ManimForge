# Security Fix: Remove Hardcoded API Keys & Secure Secrets Handling

**Date**: 2026-09-01
**Author**: Antigravity

## Summary of Changes
1. **Removed all hardcoded fallback API keys**:
   - ackend/ai_engine.py: Removed hardcoded token fallback in call_llm. Added error return if OPENROUTER_API_KEY is not present.
   - ackend/server.py: Removed hardcoded token fallback in call_llm and /api/chat_stream. Emits SSE error / returns clear error if key is missing.
2. **Added Auto .env Loader**:
   - Both ackend/server.py and ackend/ai_engine.py now automatically detect and load .env from the project root or backend folder without requiring third-party libraries.
3. **Environment Security**:
   - Updated .gitignore to ignore .env, .env.*, *.env, and Python cache artifacts.
   - Added .env.example as a template.
4. **UI Updates**:
   - Updated SettingsDialog.tsx placeholder text to clearly state environment/settings requirement.

## Verification
- python -m py_compile backend/server.py backend/ai_engine.py -> Passed with 0 errors.
- 
px tsc --noEmit -> Passed with 0 errors.
