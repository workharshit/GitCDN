# GitCDN Security Specification

## Data Invariants

1. **Images Metadata Integrity**: An image configuration cannot be written with a mismatched `uploadedBy` UID. A user can only access, upload, or delete images that correspond directly to their own Firebase Authentication UID.
2. **Folders Ownership**: Folders can only be read, created, or deleted by their respective creators. No cross-organisational exposure.
3. **Settings Isolation**: A user's GitHub Token and configuration are private, un-listable, and readable/writeable only by the owner matching the path parameter `settings/{userId}`.

## The Dirty Dozen Payloads

1. **Identity Spoofing on Image Create**: Create an image metadata document with `uploadedBy` pointing to `target_user_uid` while signed in as `attacker_uid`. Expected: `PERMISSION_DENIED`.
2. **Identity Spoofing on Image Update**: Attempt to update an image owned by `target_user_uid` to set the owner to `attacker_uid`. Expected: `PERMISSION_DENIED`.
3. **Cross-Tenant Folder Listing**: Query others' folders (`createdBy != attacker_uid`). Expected: `PERMISSION_DENIED` (due to missing query filters matching owner ID).
4. **Credential Theft on Settings Get**: Attempt to fetch `settings/target_user_uid` while signed in as `attacker_uid`. Expected: `PERMISSION_DENIED`.
5. **PII Injection on Settings Create**: Attempt to write settings for another user `settings/target_user_uid` with attacker's token. Expected: `PERMISSION_DENIED`.
6. **Path Poisoning via Large / Malformed ID**: Create a document at `images/MALFORMED_SPECIAL_CHARS_1MB_LONG` to cause system denial of wallet. Expected: `PERMISSION_DENIED`.
7. **Ghost Field Injection on Image Create**: Upload image metadata containing `isPremiumHack: true` (unallowed field). Expected: `PERMISSION_DENIED`.
8. **Immutability Bypass**: Attempt to update the `createdAt` or `uploadedBy` on an existing image document. Expected: `PERMISSION_DENIED`.
9. **State / Key Tampering on Image Update**: Update arbitrary fields on an image document without adhering to strict `affectedKeys()` limits. Expected: `PERMISSION_DENIED`.
10. **Admin Claim Mocking**: Attempt to modify profiles or set self-defined admin privileges inside standard collections. Expected: `PERMISSION_DENIED`.
11. **Negative Sizings Hack**: Create an image with `size: -500` or `width: -10`. Expected: `PERMISSION_DENIED`.
12. **Blanket Listing Query**: Client fetches all images from `images` collection without filtering by `uploadedBy == request.auth.uid`. Expected: `PERMISSION_DENIED`.
