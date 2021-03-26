const packages = require('./lib/api/packages')

const {Octokit} = require('@octokit/rest');
const {retry} = require('@octokit/plugin-retry');
const {throttling} = require('@octokit/plugin-throttling');
const octokit = Octokit.plugin(retry).plugin(throttling)

const createClient = async (token) => {
    return new octokit({
        auth: token,
        throttle: {
            onRateLimit: (retryAfter, options) => {
                console.warn(`Request quota exhausted for request ${options.method} ${options.url}`)
                console.warn(`Retrying after ${retryAfter} seconds, retry Count: ${options.request.retryCount}`)
                return true
            },
            onAbuseLimit: (retryAfter, options) => {
                console.warn(
                    `Abuse detected for request ${options.method} ${options.url}`
                );
            }
        },
        request: {
            retries: 3,
            doNotRetry: [403],
        }
    })
}

const token = process.env.GITHUB_TOKEN
const org = process.env.GITHUB_ENTERPRISE_ORG

async function main() {
    try {
        const client = await createClient(token)
        await packages.populatePackages(client, org)
        await packages.populateVersions(client, org)
        await packages.populateFiles(client, org)
    } catch (e) {
        console.log(e)
    }
}

if (require.main === module) {
    main()
}

exports.main = main