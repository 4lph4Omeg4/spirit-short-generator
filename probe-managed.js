
const fetch = require('node-fetch');

async function probeManagedModels() {
    const gatewayUrl = "https://ai-gateway.vercel.sh/v1";
    const gatewayToken = "vck_7otrSuEMCV3KMolR10yrpegmVnIRKVVCmeXlRuxzGAdN8sGbsv1BNzpb";

    const models = [
        "openai/dall-e-3",
        "dall-e-3",
        "google/imagen-4.0-generate",
        "google/imagen-4.0-fast-generate",
        "bfl/flux-pro-1.1",
        "bfl/flux-1.1-pro"
    ];

    for (const model of models) {
        console.log(`\n--- Probing Managed Model: ${model} ---`);
        try {
            const response = await fetch(`${gatewayUrl}/images/generations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gatewayToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    prompt: "A spiritual spark",
                    n: 1,
                    size: "1024x1024"
                })
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`SUCCESS with ${model}!`);
                process.exit(0);
            } else {
                console.log(`Failed ${model}: ${response.status} - ${JSON.stringify(data)}`);
            }
        } catch (e) {
            console.error(`Error probing ${model}:`, e.message);
        }
    }
}

probeManagedModels();
