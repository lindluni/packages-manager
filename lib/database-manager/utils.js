const fs = require('fs');

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const dataDir = "./data"
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}
const adapter = new FileSync(`${dataDir}/db.json`)
const db = low(adapter)

db.defaults({packages: {}, exemptions: {}}).write()

exports.insertPackage = async (packageName, object) => {
    try {
        let packages = await db.getState().packages
        packages[packageName] = object
        await db.set(`packages`, packages).write()
    } catch (error) {
        throw error
    }
}

exports.getPackage = async (packageName) => {
    try {
        return await db.getState().packages[packageName]
    } catch (error) {
        throw error
    }
}

exports.getPackages = async () => {
    try {
        return await db.getState().packages
    } catch (error) {
        throw error
    }
}