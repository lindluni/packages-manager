const database = require('../database-manager/utils')
const packageQueries = require('./queries/packages')

const fileInput = {
    fileCursor: null,
    org: null,
    packageName: null,
    packageVersion: null
}

const packageInput = {
    org: null,
    packageCursor: null
}

const versionInput = {
    org: null,
    packageName: null,
    versionCursor: null
}

exports.populatePackages = async (client, org) => {
    packageInput.org = org
    try {
        let queryResults
        do {
            queryResults = await client.graphql(packageQueries.listPackages, packageInput)
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
    versionInput.org = org
    try {
        const packages = await database.getPackages()
        for (let packageName of Object.keys(packages)) {
            versionInput.versionCursor = null
            versionInput.packageName = packageName

            let queryResult
            let versions = {}
            let totalDownloads = 0
            do {
                queryResult = await client.graphql(packageQueries.listVersions, versionInput)
                for (let versionNode of queryResult.organization.packages.nodes[0].versions.nodes) {
                    totalDownloads += versionNode.statistics.downloadsTotalCount
                    versions[versionNode.version] = {downloadCount: versionNode.statistics.downloadsTotalCount}
                }
                versionInput.versionCursor = queryResult.organization.packages.nodes[0].versions.pageInfo.endCursor
            } while (queryResult.organization.packages.nodes[0].versions.pageInfo.hasNextPage)

            let packageToUpdate = packages[packageName]
            packageToUpdate['totalDownloadCount'] = totalDownloads
            packageToUpdate['totalVersions'] = Object.keys(versions).length
            packageToUpdate['versions'] = versions
            await database.insertPackage(packageName, packageToUpdate)
        }
    } catch (error) {
        throw error
    }
}

exports.populateFiles = async (client, org) => {
    fileInput.org = org
    try {
        const packages = await database.getPackages()
        for (let packageName of Object.keys(packages)) {
            let packageLastUpdated = new Date(0)
            let totalBytes = 0
            for (let version of Object.keys(packages[packageName].versions)) {
                fileInput.fileCursor = null
                fileInput.packageName = packageName
                fileInput.packageVersion = version

                let queryResult
                let files = []
                do {
                    queryResult = await client.graphql(packageQueries.listFiles, fileInput)
                    for (let file of queryResult.organization.packages.nodes[0].version.files.nodes) {
                        totalBytes += file.size
                        files.push(file)
                    }
                    fileInput.fileCursor = queryResult.organization.packages.nodes[0].version.files.pageInfo.endCursor
                } while (queryResult.organization.packages.nodes[0].version.files.pageInfo.hasNextPage)


                let versionIDBase64 = new Buffer.from(queryResult.organization.packages.nodes[0].version.id, 'base64');
                let versionIDString = versionIDBase64.toString('ascii');
                let versionID = versionIDString.split('PackageVersion')[1]
                let packageVersion = await client.packages.getPackageVersionForOrganization({
                    org: org,
                    package_name: packageName,
                    package_type: packages[packageName].type,
                    package_version_id: versionID
                })

                let packageToUpdate = packages[packageName]
                packageToUpdate.versions[version]['lastUpdated'] = packageVersion.data.updated_at
                packageToUpdate.versions[version]['files'] = files
                await database.insertPackage(packageName, packageToUpdate)

                let versionLastUpdate = new Date(packageToUpdate.versions[version].lastUpdated)
                if (versionLastUpdate > packageLastUpdated) {
                    packageLastUpdated = versionLastUpdate
                }
            }

            let packageToUpdate = packages[packageName]
            packageToUpdate['formattedSize'] = bytesToSize(totalBytes)
            packageToUpdate['lastUpdated'] = packageLastUpdated
            packageToUpdate['totalSize'] = totalBytes
            await database.insertPackage(packageName, packageToUpdate)
        }
    } catch (error) {
        throw error
    }
}

function bytesToSize(bytes) {
    let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes !== 0) {
        let i = Math.floor(Math.log(bytes) / Math.log(1024))
        return `${(bytes / Math.pow(1024, i))} ${sizes[i]}`
    }
    return '0 Bytes'
}