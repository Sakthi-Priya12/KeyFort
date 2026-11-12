# Database: `keyfortDB`

```mermaid
erDiagram
    USERS ||--o{ LOGINLOGS : "has"
    USERS ||--o{ SECURITYLOGS : "has"
    USERS ||--o{ PASSWORDRESETS : "requests"
    USERS {
        ObjectId _id
        string name
        string email UK
        string passwordHash
        string role "user or admin"
        bool isActive
        int failedLoginAttempts
        date lockUntil
        date lastLoginAt
        date passwordChangedAt
        bool passwordMeetsPolicy
        date createdAt
        date updatedAt
    }
    LOGINLOGS {
        ObjectId user FK
        string email
        bool success
        string reason
        bool isAdminLogin
        string ip
        string userAgent
        date createdAt
    }
    SECURITYLOGS {
        ObjectId user FK
        string type
        string severity "info warning critical"
        string email
        string ip
        string details
        bool reviewed
        ObjectId reviewedBy FK
        date createdAt
    }
    PASSWORDRESETS {
        ObjectId user FK
        string tokenHash UK "SHA-256 of the token"
        date expiresAt "TTL index"
        date usedAt
        date createdAt
    }
```

A fifth collection, `sessions`, is created automatically by `connect-mongo` to hold login sessions (it expires them itself).

Indexes: unique `users.email`; `users.role`, `isActive`, `lockUntil`, `name`; `loginlogs.createdAt`, `user+createdAt`, `email`, `ip`, `success`; `securitylogs.createdAt`, `type`, `severity`, `reviewed`; `passwordresets.tokenHash` (unique) and a TTL index on `expiresAt`.
Raw passwords and raw reset tokens are never stored.
