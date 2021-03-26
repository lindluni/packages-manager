exports.listPackages = `
query listPackages($org: String!, $packageCursor: String){
  organization(login: $org) {
    packages(first: 100, after: $packageCursor) {
      nodes {
        name
        packageType
        repository {
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`

exports.listVersions = `
query listVersions($org: String!, $packageName: [String]!, $versionCursor: String){
  organization(login: $org) {
    packages(first: 1, names: $packageName) {
      nodes {
        packageType
        versions(first: 100, after: $versionCursor) {
          nodes {
            version
            statistics {
              downloadsTotalCount
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
}
`

exports.listFiles = `
query listFiles($org: String!, $packageName: [String]!, $packageVersion: String!, $fileCursor: String){
  organization(login: $org) {
    packages(first: 1, names: $packageName) {
      nodes {
        version(version: $packageVersion) {
          id
          files(first: 100, after: $fileCursor) {
            nodes {
              name
              size
              updatedAt
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  }
}
`
