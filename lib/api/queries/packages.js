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
