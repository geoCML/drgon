import { db } from "./db.js"
import { checkForBannedWords, email, key, orderBy, searchByTag, url, sanitizeString, queueForRemoval, wipeDB } from "./utils.js"
import express from "express"
import { generateApiKey } from "generate-api-key"

const app = express()
const port = 8000

app.use(express.json())

app.get("/", (req, res) => {
  res.json({
    "message": "Welcome to DRGON! See our documentation to learn how to use our REST API: https://geocml.github.io/docs/",
  })
})

app.get("/registry", async (req, res) => {
    const orderByVal = orderBy(req.body)
    const searchByTagVal = searchByTag(req.body)

    const deployments = await db.manyOrNone(`SELECT id, url, title, description, owner, tags FROM registry WHERE ${searchByTagVal} ORDER BY ${orderByVal} ASC`)

    res.json({
        "message": "Done.",
        deployments
    })
})

app.post("/registry", async (req, res) => {
    const keyVal = await sanitizeString(key(req.body))
    const urlVal = sanitizeString(url(req.body))
    const titleVal = sanitizeString(checkForBannedWords(req.body, "title"))
    const descriptionVal = sanitizeString(checkForBannedWords(req.body, "description"))
    const ownerVal = sanitizeString(checkForBannedWords(req.body, "owner"))
    const tagsVal = sanitizeString(checkForBannedWords(req.body, "tags"))

    if (keyVal === "" || urlVal === "" || titleVal === "" || descriptionVal === "" || ownerVal === "" || tagsVal === "") {
      res.json({
        "message": "Invalid request body.",
      }, 400)
      return
    }

    try {
      const id = (await db.result("SELECT * FROM registry", null, r => r.rowCount)) + 1
      await db.none(`INSERT INTO registry (id, url, title, description, owner, tags, key) VALUES (${id}, '${urlVal}', '${titleVal}', '${descriptionVal}', '${ownerVal}', '${tagsVal}', '${keyVal}')`)
    } catch {
      res.json({
        "message": "Deployment is already registered on DRGON."
      }, 400)
      return
    }

    await queueForRemoval(urlVal)
    res.json({
        "message": "Done.",
    })
})

app.get("/apikey", async (req, res) => {
  const key = generateApiKey()
  const emailVal = email(req.body)

  if (emailVal === "") {
      res.json({
        "message": "Invalid request body.",
      }, 400)
      return
  }

  try {
    await db.none(`INSERT INTO users (email, key) VALUES ('${emailVal}', '${key}')`)
  } catch {
    res.json({
      "message": "You already registered for an api key."
    }, 400)
    return
  }

  res.json({
    "message": "Done.",
    key,
    "note": "Store this api key in a safe place. You will only be able to view it once."
  })
})

app.get("/recommendations", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*")
    const tagsVal = sanitizeString(checkForBannedWords(req.query, "tags"))
    const limit = parseInt(sanitizeString(checkForBannedWords(req.query, "limit")))

    if (limit === NaN || tagsVal === "") {
        res.json({
            "message": "Invalid request body",
        }, 400)
        return
    }

    let deployments = []
    let deploymentIds = []
    for (const tag of tagsVal.split(",")) {
        const deployment = await db.manyOrNone(`SELECT * FROM registry WHERE tags LIKE '%${tag}%';`)
        if (deployment.length > 0 && !deploymentIds.includes(deployment[0].id)) {
            deployments.push(deployment)
            deploymentIds.push(deployment[0].id)
        }
    }

    res.json({
        "message": "Done.",
        "deployments": deployments.slice(0, limit),
    })
})

app.listen(port, async () => {
  await wipeDB()
  console.log(`DRGON is listening on port ${port}`)
})
