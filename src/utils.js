import * as fs from "node:fs"
import { db } from "./db.js"

// Request body sanitizers

const validColumns = ["url", "description", "owner", "tags"]

export function sanitizeString(str) {
    str = str.replaceAll("'", "")
    str = str.replaceAll("\"", "")
    return str
}

export function orderBy(body) {
    return body.hasOwnProperty("orderBy") && validColumns.includes(body["orderBy"]) ? body["orderBy"] : "url"
}

export async function key(body) {
    const keyVal = body.hasOwnProperty("key") ? sanitizeString(body["key"]) : ""
    if ((await db.result(`SELECT * FROM users WHERE key = '${keyVal}'`, null, r => r.rowCount)) === 0) return ""
    return keyVal
}

export function searchByTag(body) {
    const tags = body.hasOwnProperty("tags") ? body["tags"] : "%"
    if (tags === "%") return `tags LIKE '${tags}'`

    let query = ""
    let i = 0
    const splitTags = tags.split(",")
    splitTags.forEach((tag) => {
        query += `tags LIKE '%${tag}%'`
        if (i < splitTags.length - 1) query += " AND "
        i++
    })
    return query
}

export function url(body) {
    if (!body.hasOwnProperty("url")) return ""
    if (body["url"].match(/^(https?:\/\/)?(www.)?[a-z0-9]+\.[a-z]+(\/[a-zA-Z0-9#]+\/?)*$/)) return body["url"]
    return ""
}

export function checkForBannedWords(body, key) {
    if (!body.hasOwnProperty(key)) return ""
    try {
        const bannedWords = fs.readFileSync("./banned-words.txt", "utf8").split("\n")
        for (const bannedWord of bannedWords) {
            if (body[key].includes(bannedWord)) return ""
        }
    } catch {
        return ""
    }
    return body[key]
}

export function email(body) {
    if (!body.hasOwnProperty("email")) return ""
    if (body["email"].match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) return body["email"]
    return ""
}

export async function queueForRemoval(deployment) {
    if (await db.oneOrNone(`SELECT count(*) FROM registry WHERE url = '${deployment}';`) === null)
        return

    setTimeout(async () => {
        try {
            await db.none(`DELETE FROM registry WHERE url = '${deployment}';`)
        } catch (err) { // There is a pending transaction in PSQL, try again...
            queueForRemoval(deployment)
        }
    }, 60 * 1000, deployment)
}

export async function wipeDB() {
    await db.none("DELETE FROM registry;")
}

export async function getRecommendedDeployment(tag, deploymentURLs) {
    const deployment = await db.manyOrNone(`SELECT * FROM registry WHERE tags LIKE '%${tag}%';`)
    if (deployment.length > 0 && !deploymentURLs.includes(deployment[0].url)) {
        return deployment
    }
    return null
}
