const database = require('../database-manager/utils')
const queries = require('./queries/packages')

// const fileInput = {
//     fileCursor: null,
//     org: null,
//     packageName: null,
//     packageVersion: null
// }

const packageInput = {
    org: null,
    packageCursor: null
}

// const versionInput = {
//     org: null,
//     packageName: null,
//     versionCursor: null
// }

exports.populatePackages = async (client, org) => {
    packageInput.org = org
    try {
        let queryResults
        do {
            queryResults = await client.graphql(queries.listPackages, packageInput)
            for (let packageNode of queryResults.organization.packages.nodes) {
                await database.insertPackage(packageNode.name, {
                    packageName: packageNode.name,
                    repository: packageNode.repository.name,
                    type: packageNode.packageType.toLowerCase()
                })
            }
            packageInput.packageCursor = queryResults.organization.packages.pageInfo.endCursor
        } while (queryResults.organization.packages.pageInfo.hasNextPage)
    } catch (error) {
        throw error
    }
}

exports.populateVersions = async (client, org) => {
    try {
        let packages = await database.getPackages()
        for (let packageName of Object.keys(packages)) {
            let results = await client.paginate('GET /orgs/{org}/packages/{package_type}/{package_name}/versions', {
                org: org,
                package_type: packages[packageName].type,
                package_name: packageName,
                state: 'active'
            })
            let packageToUpdate = await database.getPackage(packageName)
            packageToUpdate['versions'] = results
            await database.insertPackage(packageName, packageToUpdate)
        }
    } catch(error) {
        throw error
    }
}
