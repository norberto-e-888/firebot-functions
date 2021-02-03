const functions = require('firebase-functions')
const dialogflow = require('dialogflow')
const dialogflowFullfillment = require('dialogflow-fulfillment')
const cors = require('cors')({ origin: true })
const admin = require('firebase-admin')
const serviceAccount = require('./service-account.json')

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://firebot-bd1ce.firebaseio.com'
})

exports.dialogflowGateway = functions.https.onRequest((req, res) => {
	cors(req, res, async () => {
		const { queryInput, sessionId } = req.body
		const sessionClient = new dialogflow.SessionsClient({
			credentials: serviceAccount
		})

		const session = sessionClient.sessionPath('firebot-bd1ce', sessionId)
		const responses = await sessionClient.detectIntent({ session, queryInput })
		responses.forEach((response, i) => {
			console.log(`RESPONSE ${i}`, JSON.stringify(response))
		})

		const result = responses[0].queryResult
		res.send(result)
	})
})

exports.dialogflowWebhook = functions.https.onRequest(
	async (request, response) => {
		const agent = new dialogflowFullfillment.WebhookClient({
			request,
			response
		})

		const result = request.body.queryResult
		async function userOnboardingHandler(agent) {
			const db = admin.firestore()
			const profile = db.collection('users').doc('norbert')
			const { name, phone } = result.parameters
			await profile.set({ name, phone })
			agent.add('Tu cuenta fue creada exitosamente ¡Bienvenid@!')
		}

		const intentMap = new Map()
		intentMap.set('Onboarding', userOnboardingHandler)
		agent.handleRequest(intentMap)
	}
)
