# ghcr-badge

`ghcr-badge` is a simple API service that can be used to generate [shields.io](https://shields.io) badges displaying the download count of a package hosted on the GitHub Container Registry. 

## Endpoints

### Get Package Download Stats

- **Endpoint**: `/api/:owner/:repo/:pkg`
- **Description**: Fetches the download statistics for the specified package.
- **Example**: `/api/eliasbenb/PlexAniBridge/plexanibridge`

### Get a Docker Pulls Badge

- **Endpoint**: `/shield/:owner/:repo/:pkg`
- **Description**: Generates a shields.io badge for the specified package's Docker pulls.
- **Example**: `/shield/eliasbenb/PlexAniBridge/plexanibridge`

## Example

To get the get the stats for a package with the API:

```bash
curl https://ghcr-badge.elias.eu.org/api/eliasbenb/PlexAniBridge/plexanibridge
```

To embed the default badge, which displays the download count, in markdown:

```markdown
![Docker Pulls](https://ghcr-badge.elias.eu.org/shield/eliasbenb/PlexAniBridge/plexanibridge)
```

![Docker Pulls](https://ghcr-badge.elias.eu.org/shield/eliasbenb/PlexAniBridge/plexanibridge)


You can also write your own badge with shields.io's [dynamic JSON badge](https://shields.io/badges/dynamic-json-badge) and have it point to the `/api` endpoint. E.g.:

```
https://img.shields.io/badge/dynamic/json?url=https://ghcr-badge.elias.eu.org/api/eliasbenb/PlexAniBridge/plexanibridge&query=downloadCount
```
