import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// Returns a promise that resolves to a boolean indicating whether the request was properly signed and not older than 5 minutes.
async function verifyTelnyxRequest(request, body, publicKey) {
	try {
		const signature = request.headers.get('telnyx-signature-ed25519');
		const timestamp = request.headers.get('telnyx-timestamp');
		const data = `${timestamp}|${body}`;
		const verified = nacl.sign.detached.verify(
			util.decodeUTF8(data),
			util.decodeBase64(signature),
			util.decodeBase64(publicKey)
		);

		if (verified) {
			const oldestAcceptableTimestamp = Date.now() / 1000 - 5 * 60;
			return Number(timestamp) >= oldestAcceptableTimestamp;
		}
	} catch (e) {}
	return false;
}

function forwardMessage(phoneNumber, json, apiKey) {
		const message = `Message from ${json.data.payload.from.phone_number}:\n${json.data.payload.text}`;
		const body = JSON.stringify({
			from: json.data.payload.to[0].phone_number,
			to: phoneNumber,
			text: message
		});
		console.log(`Forwarding: ${body}`);
		return fetch('https://api.telnyx.com/v2/messages', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body
		});

}

async function handleWebhook(request, body, env, context) {
	const verified = await verifyTelnyxRequest(request, body, env.TELNYX_PUBLIC_KEY);
	console.log(`Webhook verified: ${verified}`);
	if (!verified) return;

	const json = JSON.parse(body);
	if (json.data.event_type == 'message.received') {
		return forwardMessage(env.RECIPIENT_PHONE_NUMBER, json, env.TELNYX_API_KEY);
	}
}

export default {
	async fetch(request, env, context) {
		// The Workers platform prevents reading the request body after the client disconnects, so read the body immediately.
		// Reference: <https://community.cloudflare.com/t/2019-5-31-workers-release-notes/87476>
		const body = await request.text();
		context.waitUntil(handleWebhook(request, body, env, context));

		return new Response('Webhook accepted', {
			status: 200,
			statusText: 'OK'
		});
	}
};
