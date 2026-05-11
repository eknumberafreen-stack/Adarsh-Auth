const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generates a 2048-bit RSA key pair for signing responses.
 * Private key stays on server. Public key goes to C# client.
 */
const generateKeys = () => {
    console.log('Generating RSA-2048 Key Pair...');
    
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    const configDir = path.join(__dirname, '..', 'config', 'keys');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(path.join(configDir, 'private.pem'), privateKey);
    fs.writeFileSync(path.join(configDir, 'public.pem'), publicKey);

    console.log('✅ Keys generated successfully!');
    console.log('-----------------------------------');
    console.log('1. PRIVATE KEY saved to: backend/config/keys/private.pem (DO NOT SHARE)');
    console.log('2. PUBLIC KEY saved to:  backend/config/keys/public.pem');
    console.log('-----------------------------------');
    console.log('NEXT STEP: Open public.pem, copy the text, and send it to me.');
};

generateKeys();
