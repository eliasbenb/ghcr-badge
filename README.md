# ghcr-badge

`ghcr-badge` is a simple API service that can be used to generate [shields.io](https://shields.io) badges displaying the download count of a package hosted on the GitHub Container Registry. 

## Endpoints

### Get Repo Package Download Stats

- **Endpoint**: `/api/:owner/:repo/:pkg`
- **Description**: Fetches the download statistics for the specified package.
- **Example**: `/api/eliasbenb/PlexAniBridge/plexanibridge`

### Get User Package Download Stats

- **Endpoint**: `/api/:owner/:pkg`
- **Description**: Fetches stats for user-scoped package pages (`/users/:owner/packages/container/package/:pkg`).
- **Example**: `/api/eliasbenb/plexanibridge`

### Get a Repo package Docker Pulls Badge

- **Endpoint**: `/shield/:owner/:repo/:pkg`
- **Description**: Generates a shields.io badge for the specified package's Docker pulls.
- **Example**: `/shield/eliasbenb/PlexAniBridge/plexanibridge`

### Get a User Package Docker Pulls Badge

- **Endpoint**: `/shield/:owner/:pkg`
- **Description**: Generates a shields.io badge for user-scoped package pages.
- **Example**: `/shield/eliasbenb/plexanibridge`

## Example

To get the get the stats for a repository-scoped package, you can make a GET request to the API endpoint:

```bash
curl https://ghcr-badge.elias.eu.org/api/eliasbenb/PlexAniBridge/plexanibridge
```

User-scoped package page format:

```bash
curl https://ghcr-badge.elias.eu.org/api/eliasbenb/plexanibridge
```

To embed the default badge, which displays the download count, in markdown:

```markdown
![Docker Pulls](https://ghcr-badge.elias.eu.org/shield/eliasbenb/PlexAniBridge/plexanibridge)

For user-scoped package pages:

```markdown
![Docker Pulls](https://ghcr-badge.elias.eu.org/shield/eliasbenb/plexanibridge)
```
```

![Docker Pulls](https://ghcr-badge.elias.eu.org/shield/eliasbenb/PlexAniBridge/plexanibridge)


You can also write your own badge with shields.io's [dynamic JSON badge](https://shields.io/badges/dynamic-json-badge) and have it point to the `/api` endpoint. E.g.:

```
https://img.shields.io/badge/dynamic/json?url=https://ghcr-badge.elias.eu.org/api/eliasbenb/PlexAniBridge/plexanibridge&query=downloadCount
```

The service supports both GitHub package URL styles:

- Repository-scoped: `https://github.com/:owner/:repo/pkgs/container/:pkg`
- User-scoped: `https://github.com/users/:owner/packages/container/package/:pkg`
