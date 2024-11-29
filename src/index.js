import { db } from "./db.js"
import { checkForBannedWords, email, key, orderBy, searchByTag, url, sanitizeString, queueForRemoval } from "./utils.js"
import express from "express"
import { generateApiKey } from "generate-api-key"
import crypto from "crypto"
import word2vec from "word2vec"

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

    const deployments = await db.manyOrNone(`SELECT url, title, description, owner, tags FROM registry WHERE ${searchByTagVal} ORDER BY ${orderByVal} ASC`)

    res.json({
        "message": "Done.",
        deployments
    })
})

app.post("/registry", async (req, res) => {
    const keyVal = await key(req.body)
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
      await db.none(`INSERT INTO registry (url, title, description, owner, tags, key) VALUES ('${urlVal}', '${titleVal}', '${descriptionVal}', '${ownerVal}', '${tagsVal}', '${keyVal}')`)
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
  const emailVal = sanitizeString(email(req.body))

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
    let deploymentURLs = []
    for (const tag of tagsVal.split(",")) {
        const deployment = await db.manyOrNone(`SELECT * FROM registry WHERE tags LIKE '%${tag}%';`)
        if (deployment.length > 0 && !deploymentURLs.includes(deployment[0].url)) {
            deployments.push(deployment)
            deploymentURLs.push(deployment[0].url)
        }
    }

    word2vec.loadModel('/drgon/glove.6B.50d.txt', async (err, model) => {
        if (err) return
        for (const tag of tagsVal.split(",")) {
            try {
                const nearestWords = model.getNearestWords(model.getVector(tag), 3)
                for (const nearestWord of nearestWords) {
                    const deployment = await db.manyOrNone(`SELECT * FROM registry WHERE tags LIKE '%${nearestWord}%';`)
                    if (deployment.length > 0 && !deploymentURLs.includes(deployment[0].url)) {
                        deployments.push(deployment)
                        deploymentURLs.push(deployment[0].url)
                    }
                }
            } catch {}
        }
    })

    res.json({
        "message": "Done.",
        "deployments": deployments.slice(0, limit),
    })
})

app.listen(port, async () => {
  console.log(`DRGON is listening on port ${port}`)
})
