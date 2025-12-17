
const OpenAI = require('openai');
const fetch = require('node-fetch');

async function probeGateway() {
    const gatewayUrl = "https://ai-gateway.vercel.sh/v1";
    const gatewayToken = "vck_7otrSuEMCV3KMolR10yrpegmVnIRKVVCmeXlRuxzGAdN8sGbsv1BNzpb";

    const tests = [
        { provider: 'openai', model: 'dall-e-3' },
        { provider: 'openai', model: 'openai/dall-e-3' },
        { provider: 'replicate', model: 'replicate/flux-1-dev' },
        { provider: 'google', model: 'imagen-3.0-generate-001' },
        { provider: 'google', model: 'google/imagen-3.0-generate-001' }
    ];

    for (const test of tests) {
        console.log(`\n--- Testing Provider: ${test.provider}, Model: ${test.model} ---`);
        try {
            const response = await fetch(`${gatewayUrl}/images/generations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gatewayToken}`,
                    'Content-Type': 'application/json',
                    'X-Vercel-AI-Provider': test.provider
                },
                body: JSON.stringify({
                    model: test.model,
                    prompt: "A simple spiritual dot",
                    n: 1,
                    size: "1024x1024"
                })
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`Success! Data received.`);
                break;
            } else {
                console.log(`Failed: ${response.status} - ${JSON.stringify(data)}`);
            }
        } catch (e) {
            console.error(`Error: ${e.message}`);
        }
    }
}

probeGateway();
