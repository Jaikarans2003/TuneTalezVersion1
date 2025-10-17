# Firestore Rules Guide for TuneTalez

## Overview

This document provides information about the Firestore security rules implemented in the TuneTalez application. These rules control access to the Firestore database based on user authentication and roles.

## Rule Functions

The following helper functions are defined in the rules:

- `isAuthenticated()`: Checks if the user is authenticated
- `isAuthor()`: Checks if the user is authenticated and has the 'author' role
- `isOwner(userId)`: Checks if the authenticated user is the owner of the document

## Collection Access Rules

### PDFs Collection

```
match /pdfs/{document=**} {
  allow read: if true;
  allow create, update: if isAuthenticated() && isAuthor();
  allow delete: if isAuthenticated() && isAuthor() && resource.data.authorId == request.auth.uid;
}
```

- **Read**: Public access (anyone can read)
- **Create/Update**: Authenticated authors only
- **Delete**: Authors can only delete their own PDFs

### Books Collection

```
match /books/{document=**} {
  allow read: if true;
  allow create, update: if isAuthenticated() && isAuthor();
  allow delete: if isAuthenticated() && isAuthor() && resource.data.authorId == request.auth.uid;
}
```

- **Read**: Public access (anyone can read)
- **Create/Update**: Authenticated authors only
- **Delete**: Authors can only delete their own books

### Users Collection

```
match /users/{userId} {
  allow read: if isAuthenticated() && isOwner(userId);
  allow create: if isAuthenticated() && isOwner(userId);
  allow update: if isAuthenticated() && isOwner(userId) && 
                !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']);
  allow delete: if false; // No one can delete user accounts
}
```

- **Read**: User can read their own document
- **Create**: User can create their own document
- **Update**: Users can update their own document but cannot change their role
- **Delete**: Not allowed

## Testing the Rules

### Using the Verification Scripts

A verification script is provided in the `src/scripts` directory:

1. `test-security-rules.js`: A Jest-based test suite for the Firestore rules

### Common Issues

1. **Permission Denied Errors**: 
   - Ensure the user has the correct role in their profile document
   - Check that the user is properly authenticated
   - Verify the rules are deployed correctly

## Deploying Rules

To deploy updated Firestore rules:

```bash
firebase deploy --only firestore:rules
```

## Best Practices

1. Always test rule changes thoroughly before deploying to production
2. Use the principle of least privilege - only grant the minimum access needed
3. Be careful with public write access as it can lead to security vulnerabilities
4. Regularly audit and review your security rules
5. Consider using the Firebase Emulator Suite for local testing