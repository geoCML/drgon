import { db } from "./db.js"
import { checkForBannedWords, email, key, orderBy, searchByTag, url, sanitizeString, queueForRemoval, getRecommendedDeployment } from "./utils.js"
import express from "express"
import { generateApiKey } from "generate-api-key"
import word2vec from "word2vec"
import packageJSON from "./package.json" with { type: "json" }

const app = express()
const port = 8000

app.use(express.json())

app.get("/", (_, res) => {
  res.status(200).json({
    "message": "Welcome to DRGON! See our documentation to learn how to use our REST API: https://geocml.github.io/docs/",
    "version": packageJSON.version
  })
})

app.get("/registry", async (req, res) => {
    const orderByVal = orderBy(req.body)
    const searchByTagVal = searchByTag(req.body)

    const deployments = await db.manyOrNone(`SELECT url, title, description, owner, tags FROM registry WHERE ${searchByTagVal} ORDER BY ${orderByVal} ASC`)

    res.status(200).json({
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
      res.status(400).json({
        "message": "Invalid request body.",
      })
      return
    }

    try {
      await db.none(`INSERT INTO registry (url, title, description, owner, tags, key) VALUES ('${urlVal}', '${titleVal}', '${descriptionVal}', '${ownerVal}', '${tagsVal}', '${keyVal}')`)
    } catch {
      res.status(400).json({
        "message": "Deployment is already registered on DRGON."
      })
      return
    }

    await queueForRemoval(urlVal)
    res.status(200).json({
        "message": "Done.",
    })
})

app.get("/apikey", async (req, res) => {
  const key = generateApiKey()
  const emailVal = sanitizeString(email(req.body))

  if (emailVal === "") {
      res.status(400).json({
        "message": "Invalid request body.",
      })
      return
  }

  try {
    await db.none(`INSERT INTO users (email, key) VALUES ('${emailVal}', '${key}')`)
  } catch {
    res.status(400).json({
      "message": "You already registered for an api key."
    })
    return
  }

  res.status(200).json({
    "message": "Done.",
    key,
    "note": "Store this api key in a safe place. You will only be able to view it once."
  })
})

app.get("/recommendations", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*")
    const tagsVal = sanitizeString(checkForBannedWords(req.query, "tags"))
    const limit = parseInt(sanitizeString(checkForBannedWords(req.query, "limit")))

    if (isNaN(limit) || tagsVal === "") {
        res.status(400).json({
            "message": "Invalid request body",
        })
        return
    }

    let deployments = []
    let deploymentURLs = []
    for (const tag of tagsVal.split(",")) {
        const deployment = await getRecommendedDeployment(tag, deploymentURLs)
        if (deployment !== null) {
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
                    const deployment = await getRecommendedDeployment(nearestWord, deploymentURLs)
                    if (deployment !== null) {
                        deployments.push(deployment)
                        deploymentURLs.push(deployment[0].url)
                    }
                }
            } catch {} // eslint-disable-line no-empty
        }
    })

    res.status(200).json({
        "message": "Done.",
        "deployments": deployments.slice(0, limit),
    })
})

app.listen(port, async () => {
  console.log(`DRGON is listening on port ${port}`)
})
